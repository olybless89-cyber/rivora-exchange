import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";

const FLW_BASE = "https://api.flutterwave.com/v3";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Authenticate caller
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const authHeader = req.headers.get("Authorization") ?? "";
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) return errorResponse("Unauthorized", 401);

    const { amount, currency = "NGN", redirect_url } = await req.json() as {
      amount?: number;
      currency?: string;
      redirect_url?: string;
    };

    if (!amount || isNaN(amount)) return errorResponse("amount is required");

    // Fetch user + tenant config
    const { data: dbUser } = await supabase
      .from("users")
      .select("*, tenants!inner(min_deposit, flw_secret_key, name, flw_public_key)")
      .eq("id", user.id)
      .maybeSingle();

    if (!dbUser) return errorResponse("User not found", 404);

    const tenant = (dbUser as any).tenants;
    if (!tenant?.flw_secret_key) return errorResponse("Payment not configured for this site", 503);
    if (amount < Number(tenant.min_deposit)) {
      return errorResponse(`Minimum deposit is ${tenant.min_deposit}`);
    }

    const txRef = `FLW-${dbUser.tenant_id}-${crypto.randomUUID()}`;

    // Persist pending deposit request
    const { data: depositReq, error: insertErr } = await supabase
      .from("deposit_requests")
      .insert({
        tenant_id: dbUser.tenant_id,
        user_id: user.id,
        amount,
        payment_method: `Flutterwave (${currency})`,
        flw_tx_ref: txRef,
        status: "pending",
      })
      .select()
      .maybeSingle();

    if (insertErr || !depositReq) return errorResponse("Failed to create deposit request", 500);

    // Call Flutterwave
    const flwPayload = {
      tx_ref: txRef,
      amount,
      currency,
      redirect_url: redirect_url || `${req.headers.get("origin") ?? ""}/payment-callback`,
      customer: {
        email: `${dbUser.phone.replace("+", "")}@rivora.app`,
        phonenumber: dbUser.phone,
        name: dbUser.full_name,
      },
      customizations: {
        title: tenant.name,
        description: `Fund your ${tenant.name} account`,
      },
      meta: { deposit_request_id: depositReq.id, user_id: user.id, tenant_id: dbUser.tenant_id },
    };

    const flwRes = await fetch(`${FLW_BASE}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tenant.flw_secret_key}` },
      body: JSON.stringify(flwPayload),
    });
    const flwData = await flwRes.json() as { status: string; data?: { link: string }; message?: string };

    if (!flwRes.ok || flwData.status !== "success") {
      await supabase.from("deposit_requests").delete().eq("id", depositReq.id);
      return errorResponse(flwData.message ?? "Payment gateway error", 502);
    }

    return jsonResponse({ payment_link: flwData.data!.link, tx_ref: txRef, deposit_request_id: depositReq.id }, 201);
  } catch (e) {
    return errorResponse(String(e), 500);
  }
});
