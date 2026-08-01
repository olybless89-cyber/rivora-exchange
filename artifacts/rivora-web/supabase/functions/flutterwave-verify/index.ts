import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";

const FLW_BASE = "https://api.flutterwave.com/v3";
const REFERRAL_RATES = [0.10, 0.02, 0.02];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const authHeader = req.headers.get("Authorization") ?? "";
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) return errorResponse("Unauthorized", 401);

    const { tx_ref } = await req.json() as { tx_ref?: string };
    if (!tx_ref?.startsWith("FLW-")) return errorResponse("Invalid tx_ref");

    const { data: depositReq } = await supabase
      .from("deposit_requests")
      .select("*, users!inner(tenant_id, tenants!inner(flw_secret_key, welcome_bonus))")
      .eq("flw_tx_ref", tx_ref)
      .maybeSingle();

    if (!depositReq) return errorResponse("Deposit request not found", 404);
    if (depositReq.user_id !== user.id) return errorResponse("Forbidden", 403);

    // Already processed
    if (depositReq.status !== "pending") {
      return jsonResponse({ status: depositReq.status, deposit_request: depositReq });
    }

    const tenant = (depositReq as any).users?.tenants;
    if (!tenant?.flw_secret_key) return errorResponse("Payment not configured", 503);

    // Verify with Flutterwave
    const flwRes = await fetch(
      `${FLW_BASE}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(tx_ref)}`,
      { headers: { Authorization: `Bearer ${tenant.flw_secret_key}` } },
    );
    const flwData = await flwRes.json() as {
      status: string;
      data?: { status: string; amount: number; currency: string };
      message?: string;
    };

    if (!flwRes.ok || flwData.status !== "success") {
      return errorResponse(flwData.message ?? "Verification failed", 502);
    }

    const txStatus = flwData.data!.status;

    if (txStatus === "successful") {
      await creditDeposit(supabase, depositReq.id, depositReq.user_id, Number(depositReq.amount), `Flutterwave (${flwData.data!.currency})`, Number(tenant.welcome_bonus));
      const { data: updated } = await supabase.from("deposit_requests").select("*").eq("id", depositReq.id).maybeSingle();
      return jsonResponse({ status: "approved", deposit_request: updated });
    } else if (txStatus === "failed" || txStatus === "cancelled") {
      await supabase.from("deposit_requests").update({ status: "rejected", reviewed_at: new Date().toISOString() }).eq("id", depositReq.id);
      return jsonResponse({ status: "rejected" });
    }

    return jsonResponse({ status: "pending" });
  } catch (e) {
    return errorResponse(String(e), 500);
  }
});

async function creditDeposit(
  supabase: ReturnType<typeof createClient>,
  depositRequestId: string,
  userId: string,
  amount: number,
  method: string,
  welcomeBonus: number,
) {
  // Re-check idempotency
  const { data: req } = await supabase.from("deposit_requests").select("status, tenant_id").eq("id", depositRequestId).maybeSingle();
  if (!req || req.status !== "pending") return;

  await supabase.from("deposit_requests").update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", depositRequestId);

  const { data: dbUser } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();
  if (!dbUser) return;

  let newBalance = Number(dbUser.balance) + amount;
  const tenantId = dbUser.tenant_id;
  const ref = () => `TXN-${crypto.randomUUID().slice(0, 16).toUpperCase()}`;

  await supabase.from("transactions").insert({ tenant_id: tenantId, user_id: userId, type: "deposit", amount, status: "completed", reference: ref(), description: `Deposit via ${method}` });

  // Referral commissions
  let ancestorId: string | null = dbUser.referred_by;
  for (let lvl = 0; lvl < REFERRAL_RATES.length && ancestorId; lvl++) {
    const { data: ancestor } = await supabase.from("users").select("*").eq("id", ancestorId).maybeSingle();
    if (!ancestor) break;
    const commission = Math.round(amount * REFERRAL_RATES[lvl] * 100) / 100;
    if (commission > 0) {
      await supabase.from("transactions").insert({ tenant_id: tenantId, user_id: ancestor.id, type: "referral_bonus", amount: commission, status: "completed", reference: ref(), description: `Level ${lvl + 1} referral commission` });
      await supabase.from("users").update({ balance: String(Number(ancestor.balance) + commission), updated_at: new Date().toISOString() }).eq("id", ancestor.id);
    }
    ancestorId = ancestor.referred_by;
  }

  // Welcome bonus — first deposit only
  if (!dbUser.has_received_welcome_bonus && welcomeBonus > 0) {
    newBalance += welcomeBonus;
    await supabase.from("transactions").insert({ tenant_id: tenantId, user_id: userId, type: "bonus", amount: welcomeBonus, status: "completed", reference: ref(), description: "Welcome bonus (first deposit)" });
  }

  await supabase.from("users").update({
    balance: String(newBalance),
    has_received_welcome_bonus: true,
    updated_at: new Date().toISOString(),
  }).eq("id", userId);
}
