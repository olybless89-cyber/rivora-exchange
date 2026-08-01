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

    const { plan_id, amount } = await req.json() as { plan_id: string; amount: number };
    if (!plan_id || !amount) return errorResponse("plan_id and amount required");

    const { data: dbUser } = await supabase.from("users").select("*").eq("id", user.id).maybeSingle();
    if (!dbUser) return errorResponse("User not found", 404);

    if (Number(dbUser.balance) < amount) return errorResponse("Insufficient balance");

    const { data: plan } = await supabase.from("investment_plans").select("*").eq("id", plan_id).maybeSingle();
    if (!plan || !plan.is_active) return errorResponse("Plan not found or inactive", 404);
    if (amount < Number(plan.min_amount)) return errorResponse(`Minimum investment is ${plan.min_amount}`);
    if (plan.max_amount && amount > Number(plan.max_amount)) return errorResponse(`Maximum investment is ${plan.max_amount}`);

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.duration_days);
    const ref = `TXN-${crypto.randomUUID().slice(0, 16).toUpperCase()}`;

    // Deduct balance
    await supabase.from("users").update({
      balance: String(Number(dbUser.balance) - amount),
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);

    // Create investment record
    const { data: investment } = await supabase.from("user_investments").insert({
      tenant_id: dbUser.tenant_id,
      user_id: user.id,
      plan_id,
      plan_name: plan.name,
      amount,
      daily_rate: plan.daily_rate,
      end_date: endDate.toISOString(),
      status: "active",
    }).select().maybeSingle();

    // Log transaction
    await supabase.from("transactions").insert({
      tenant_id: dbUser.tenant_id,
      user_id: user.id,
      type: "investment",
      amount,
      status: "completed",
      reference: ref,
      description: `Invested in ${plan.name}`,
    });

    return jsonResponse({ investment }, 201);
  } catch (e) {
    return errorResponse(String(e), 500);
  }
});
