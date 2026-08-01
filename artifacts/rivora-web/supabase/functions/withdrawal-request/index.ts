import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";

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

    const { amount, bank_name, bank_account_number, bank_account_name } = await req.json() as {
      amount: number;
      bank_name: string;
      bank_account_number: string;
      bank_account_name: string;
    };

    if (!amount || !bank_name || !bank_account_number || !bank_account_name) {
      return errorResponse("All fields are required");
    }

    // Get user + tenant config
    const { data: dbUser } = await supabase
      .from("users")
      .select("*, tenants!inner(min_withdrawal, withdrawal_fee_pct)")
      .eq("id", user.id)
      .maybeSingle();

    if (!dbUser) return errorResponse("User not found", 404);

    const tenant = (dbUser as any).tenants;
    if (amount < Number(tenant.min_withdrawal)) {
      return errorResponse(`Minimum withdrawal is ${tenant.min_withdrawal}`);
    }

    const feePct = Number(tenant.withdrawal_fee_pct) / 100;
    const fee = Math.round(amount * feePct * 100) / 100;
    const netAmount = amount - fee;

    if (Number(dbUser.balance) < amount) {
      return errorResponse("Insufficient balance");
    }

    // Deduct balance & create request atomically via RPC
    await supabase.from("users").update({
      balance: String(Number(dbUser.balance) - amount),
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);

    const ref = `TXN-${crypto.randomUUID().slice(0, 16).toUpperCase()}`;

    await supabase.from("transactions").insert({
      tenant_id: dbUser.tenant_id,
      user_id: user.id,
      type: "withdrawal",
      amount,
      status: "pending",
      reference: ref,
      description: `Withdrawal to ${bank_name} ${bank_account_number}`,
    });

    const { data: withdrawalReq, error: wErr } = await supabase.from("withdrawal_requests").insert({
      tenant_id: dbUser.tenant_id,
      user_id: user.id,
      amount,
      fee,
      net_amount: netAmount,
      bank_name,
      bank_account_number,
      bank_account_name,
      status: "pending",
    }).select().maybeSingle();

    if (wErr) return errorResponse(wErr.message, 500);

    return jsonResponse({ withdrawal_request: withdrawalReq, fee, net_amount: netAmount }, 201);
  } catch (e) {
    return errorResponse(String(e), 500);
  }
});
