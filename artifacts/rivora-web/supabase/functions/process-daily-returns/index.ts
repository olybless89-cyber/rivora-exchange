import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// This function is called by pg_cron once per day via pg_net.
// It finds all active investments whose last_credited_at < today (UTC),
// calculates daily ROI = amount * (daily_rate / 100), credits the user's
// balance, logs a transaction, and marks the investment as completed when
// end_date is reached.

serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  // Fetch all active investments not yet credited today
  const { data: investments, error: fetchErr } = await supabase
    .from("user_investments")
    .select("id, tenant_id, user_id, amount, daily_rate, end_date, last_credited_at")
    .eq("status", "active")
    .or(`last_credited_at.is.null,last_credited_at.lt.${todayISO}`);

  if (fetchErr) {
    console.error("fetch investments error:", fetchErr);
    return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500 });
  }

  if (!investments || investments.length === 0) {
    console.log("No investments to process");
    return new Response(JSON.stringify({ processed: 0 }), { status: 200 });
  }

  let processed = 0;
  let completed = 0;
  const errors: string[] = [];

  for (const inv of investments) {
    try {
      const dailyReturn = Math.round(Number(inv.amount) * (Number(inv.daily_rate) / 100) * 100) / 100;
      const isExpired = new Date(inv.end_date) <= new Date();
      const newStatus = isExpired ? "completed" : "active";
      const txRef = `ROI-${inv.id.slice(0, 8).toUpperCase()}-${Date.now()}`;

      // Fetch current user balance
      const { data: user, error: userErr } = await supabase
        .from("users")
        .select("balance")
        .eq("id", inv.user_id)
        .maybeSingle();

      if (userErr || !user) {
        errors.push(`user ${inv.user_id}: ${userErr?.message ?? "not found"}`);
        continue;
      }

      const newBalance = Math.round((Number(user.balance) + dailyReturn) * 100) / 100;

      // Credit balance
      const { error: balErr } = await supabase
        .from("users")
        .update({ balance: String(newBalance), updated_at: new Date().toISOString() })
        .eq("id", inv.user_id);

      if (balErr) {
        errors.push(`balance update ${inv.user_id}: ${balErr.message}`);
        continue;
      }

      // Log transaction
      const { error: txErr } = await supabase.from("transactions").insert({
        tenant_id: inv.tenant_id,
        user_id: inv.user_id,
        type: "investment_return",
        amount: dailyReturn,
        status: "completed",
        reference: txRef,
        description: `Daily ROI (${inv.daily_rate}% of ₦${inv.amount})`,
      });

      if (txErr) {
        errors.push(`transaction ${inv.id}: ${txErr.message}`);
        continue;
      }

      // Update investment: mark last_credited_at + status if expired
      const { error: invErr } = await supabase
        .from("user_investments")
        .update({
          last_credited_at: new Date().toISOString(),
          status: newStatus,
        })
        .eq("id", inv.id);

      if (invErr) {
        errors.push(`investment update ${inv.id}: ${invErr.message}`);
        continue;
      }

      processed++;
      if (isExpired) completed++;
    } catch (e) {
      errors.push(`investment ${inv.id}: ${String(e)}`);
    }
  }

  console.log(`Daily ROI: processed=${processed}, completed=${completed}, errors=${errors.length}`);
  if (errors.length > 0) console.error("Errors:", errors);

  return new Response(
    JSON.stringify({ processed, completed, errors: errors.length > 0 ? errors : undefined }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
