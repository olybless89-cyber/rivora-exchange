import { supabase } from "./client";
import type { User, InvestmentPlan, UserInvestment, Transaction, DepositRequest, WithdrawalRequest } from "./types";

// ─── AUTH ────────────────────────────────────────────────────────────────────

export async function signInWithPhone(phone: string, password: string) {
  // We use email field with phone-derived email for Supabase Auth
  const email = phoneToEmail(phone);
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithPhone(
  phone: string,
  password: string,
  fullName: string,
  referralCode: string,
  tenantId: string,
) {
  const email = phoneToEmail(phone);
  return supabase.functions.invoke("auth-register", {
    body: { phone, password, full_name: fullName, referral_code: referralCode, tenant_id: tenantId },
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export function onAuthStateChange(cb: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
  return supabase.auth.onAuthStateChange(cb);
}

// ─── CURRENT USER ────────────────────────────────────────────────────────────

export async function getMe(): Promise<User | null> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return null;
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", session.session.user.id)
    .maybeSingle();
  return data ?? null;
}

export async function updateProfile(updates: Record<string, unknown>) {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) throw new Error("Not authenticated");
  const { error } = await (supabase as any)
    .from("users")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", session.session.user.id);
  if (error) throw error;
}

// ─── INVESTMENT PLANS ────────────────────────────────────────────────────────

export async function getInvestmentPlans(tenantId: string): Promise<InvestmentPlan[]> {
  const { data } = await supabase
    .from("investment_plans")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("min_amount", { ascending: true });
  return Array.isArray(data) ? data : [];
}

// ─── USER INVESTMENTS ────────────────────────────────────────────────────────

export async function getMyInvestments(): Promise<UserInvestment[]> {
  const { data } = await supabase
    .from("user_investments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  return Array.isArray(data) ? data : [];
}

export async function createInvestment(payload: {
  tenant_id: string;
  plan_id: string;
  plan_name: string;
  amount: number;
  daily_rate: number;
  end_date: string;
}) {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) throw new Error("Not authenticated");
  return supabase.functions.invoke("invest", { body: payload });
}

// ─── TRANSACTIONS ────────────────────────────────────────────────────────────

export async function getMyTransactions(page = 0, pageSize = 20): Promise<Transaction[]> {
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const { data } = await supabase
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .range(from, to);
  return Array.isArray(data) ? data : [];
}

// ─── DEPOSIT REQUESTS ────────────────────────────────────────────────────────

export async function getMyDepositRequests(): Promise<DepositRequest[]> {
  const { data } = await supabase
    .from("deposit_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  return Array.isArray(data) ? data : [];
}

// ─── WITHDRAWAL REQUESTS ─────────────────────────────────────────────────────

export async function getMyWithdrawalRequests(): Promise<WithdrawalRequest[]> {
  const { data } = await supabase
    .from("withdrawal_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  return Array.isArray(data) ? data : [];
}

export async function createWithdrawalRequest(payload: {
  amount: number;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
}) {
  return supabase.functions.invoke("withdrawal-request", { body: payload });
}

// ─── REFERRALS ───────────────────────────────────────────────────────────────

export async function getMyReferrals(): Promise<Pick<User, "id" | "full_name" | "created_at" | "balance">[]> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return [];
  const { data } = await supabase
    .from("users")
    .select("id, full_name, created_at, balance")
    .eq("referred_by", session.session.user.id)
    .order("created_at", { ascending: false })
    .limit(200);
  return Array.isArray(data) ? data : [];
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.startsWith("234")) return `+${digits}`;
  if (digits.startsWith("0")) return `+234${digits.slice(1)}`;
  return `+234${digits}`;
}

// Supabase Auth requires email; we derive a deterministic one from phone
export function phoneToEmail(phone: string): string {
  return `${normalizePhone(phone).replace("+", "")}@rivora.app`;
}
