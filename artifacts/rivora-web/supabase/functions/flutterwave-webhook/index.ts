import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { jsonResponse } from "../_shared/cors.ts";

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const event = await req.json() as {
      event?: string;
      data?: { status: string; tx_ref: string; amount: number; currency: string };
    };

    if (event.event !== "charge.completed" || !event.data) return jsonResponse({ received: true });

    const { tx_ref, status, currency } = event.data;
    if (!tx_ref?.startsWith("FLW-")) return jsonResponse({ received: true });

    // Get deposit request + tenant flw_webhook_hash for verification
    const { data: depositReq } = await supabase
      .from("deposit_requests")
      .select("*, users!inner(tenants!inner(flw_webhook_hash, welcome_bonus))")
      .eq("flw_tx_ref", tx_ref)
      .maybeSingle();

    if (!depositReq || depositReq.status !== "pending") return jsonResponse({ received: true });

    // Verify webhook hash
    const tenant = (depositReq as any).users?.tenants;
    const expectedHash = tenant?.flw_webhook_hash;
    if (expectedHash) {
      const signature = req.headers.get("verif-hash");
      if (signature !== expectedHash) return new Response("Unauthorized", { status: 401 });
    }

    if (status === "successful") {
      // Delegate to verify function logic inline
      await creditApproved(supabase, depositReq.id, depositReq.user_id, Number(depositReq.amount), `Flutterwave (${currency})`, Number(tenant?.welcome_bonus ?? 0), depositReq.tenant_id);
    } else if (status === "failed" || status === "cancelled") {
      await supabase.from("deposit_requests").update({ status: "rejected", reviewed_at: new Date().toISOString() }).eq("id", depositReq.id);
    }

    return jsonResponse({ received: true });
  } catch (e) {
    console.error("webhook error", e);
    return jsonResponse({ received: true, error: String(e) });
  }
});

async function creditApproved(
  supabase: ReturnType<typeof createClient>,
  depositRequestId: string,
  userId: string,
  amount: number,
  method: string,
  welcomeBonus: number,
  tenantId: string,
) {
  const { data: req } = await supabase.from("deposit_requests").select("status").eq("id", depositRequestId).maybeSingle();
  if (!req || req.status !== "pending") return;

  await supabase.from("deposit_requests").update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", depositRequestId);

  const { data: user } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();
  if (!user) return;

  const ref = () => `TXN-${crypto.randomUUID().slice(0, 16).toUpperCase()}`;
  let newBalance = Number(user.balance) + amount;

  await supabase.from("transactions").insert({ tenant_id: tenantId, user_id: userId, type: "deposit", amount, status: "completed", reference: ref(), description: `Deposit via ${method}` });

  const RATES = [0.10, 0.02, 0.02];
  let ancestorId = user.referred_by;
  for (let lvl = 0; lvl < RATES.length && ancestorId; lvl++) {
    const { data: ancestor } = await supabase.from("users").select("*").eq("id", ancestorId).maybeSingle();
    if (!ancestor) break;
    const commission = Math.round(amount * RATES[lvl] * 100) / 100;
    if (commission > 0) {
      await supabase.from("transactions").insert({ tenant_id: tenantId, user_id: ancestor.id, type: "referral_bonus", amount: commission, status: "completed", reference: ref(), description: `Level ${lvl + 1} referral commission` });
      await supabase.from("users").update({ balance: String(Number(ancestor.balance) + commission), updated_at: new Date().toISOString() }).eq("id", ancestor.id);
    }
    ancestorId = ancestor.referred_by;
  }

  if (!user.has_received_welcome_bonus && welcomeBonus > 0) {
    newBalance += welcomeBonus;
    await supabase.from("transactions").insert({ tenant_id: tenantId, user_id: userId, type: "bonus", amount: welcomeBonus, status: "completed", reference: ref(), description: "Welcome bonus" });
  }

  await supabase.from("users").update({ balance: String(newBalance), has_received_welcome_bonus: true, updated_at: new Date().toISOString() }).eq("id", userId);
}
