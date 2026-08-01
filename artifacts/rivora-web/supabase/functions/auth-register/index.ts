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

    const { phone, password, full_name, referral_code, tenant_id } = await req.json() as {
      phone: string;
      password: string;
      full_name: string;
      referral_code?: string;
      tenant_id: string;
    };

    if (!phone || !password || !full_name) return errorResponse("phone, password, full_name required");

    // Normalize Nigerian phone
    const digits = phone.replace(/[^\d]/g, "");
    const normalizedPhone = digits.startsWith("234") ? `+${digits}` : digits.startsWith("0") ? `+234${digits.slice(1)}` : `+234${digits}`;

    // Check if tenant requires referral
    const { data: tenant } = await supabase.from("tenants").select("require_referral, welcome_bonus").eq("id", tenant_id).maybeSingle();
    if (!tenant) return errorResponse("Invalid tenant", 404);

    let referrerId: string | null = null;
    if (tenant.require_referral || referral_code) {
      if (!referral_code) return errorResponse("A referral code is required to register");
      const { data: referrer } = await supabase.from("users").select("id").eq("tenant_id", tenant_id).eq("referral_code", referral_code.trim().toUpperCase()).maybeSingle();
      if (!referrer) return errorResponse("Invalid referral code");
      referrerId = referrer.id;
    }

    // Check duplicate phone
    const { data: existing } = await supabase.from("users").select("id").eq("tenant_id", tenant_id).eq("phone", normalizedPhone).maybeSingle();
    if (existing) return errorResponse("An account with this phone number already exists");

    // Generate unique referral code
    let ownCode = generateCode();
    for (let i = 0; i < 5; i++) {
      const { data: clash } = await supabase.from("users").select("id").eq("tenant_id", tenant_id).eq("referral_code", ownCode).maybeSingle();
      if (!clash) break;
      ownCode = generateCode();
    }

    // Create Supabase auth user
    const email = `${normalizedPhone.replace("+", "")}@rivora.app`;
    const { data: authData, error: signUpErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (signUpErr || !authData.user) return errorResponse(signUpErr?.message ?? "Auth signup failed", 500);

    // Insert user profile
    const { error: userErr } = await supabase.from("users").insert({
      id: authData.user.id,
      tenant_id,
      phone: normalizedPhone,
      password_hash: "supabase-auth",
      full_name,
      role: "user",
      status: "active",
      balance: 0,
      referral_code: ownCode,
      referred_by: referrerId,
      has_received_welcome_bonus: false,
    });

    if (userErr) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      return errorResponse(userErr.message, 500);
    }

    // Sign in to get session
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signInErr) return errorResponse("Registered but sign-in failed", 500);

    return jsonResponse({ session: signInData.session, referral_code: ownCode }, 201);
  } catch (e) {
    return errorResponse(String(e), 500);
  }
});

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}
