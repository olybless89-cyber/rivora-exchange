export type UserRole = "user" | "admin" | "superadmin";
export type UserStatus = "active" | "inactive";
export type TransactionType = "deposit" | "withdrawal" | "investment" | "bonus" | "referral_bonus" | "investment_return";
export type TransactionStatus = "pending" | "completed" | "rejected";
export type RequestStatus = "pending" | "approved" | "rejected";
export type InvestmentStatus = "active" | "completed" | "cancelled";

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  tagline: string | null;
  support_email: string | null;
  support_phone: string | null;
  telegram_url: string | null;
  whatsapp_url: string | null;
  currencies: string[];
  enabled_features: string[];
  flw_public_key: string | null;
  min_deposit: number;
  min_withdrawal: number;
  withdrawal_fee_pct: number;
  welcome_bonus: number;
  referral_l1_rate: number;
  referral_l2_rate: number;
  referral_l3_rate: number;
  require_referral: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  tenant_id: string;
  phone: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  balance: number;
  referral_code: string;
  referred_by: string | null;
  has_received_welcome_bonus: boolean;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
}

export interface InvestmentPlan {
  id: string;
  tenant_id: string;
  name: string;
  daily_rate: number;
  min_amount: number;
  max_amount: number | null;
  duration_days: number;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface UserInvestment {
  id: string;
  tenant_id: string;
  user_id: string;
  plan_id: string;
  plan_name: string;
  amount: number;
  daily_rate: number;
  start_date: string;
  end_date: string;
  status: InvestmentStatus;
  created_at: string;
}

export interface Transaction {
  id: string;
  tenant_id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  reference: string;
  description: string | null;
  created_at: string;
}

export interface DepositRequest {
  id: string;
  tenant_id: string;
  user_id: string;
  amount: number;
  payment_method: string;
  proof_url: string | null;
  flw_tx_ref: string | null;
  status: RequestStatus;
  created_at: string;
  reviewed_at: string | null;
}

export interface WithdrawalRequest {
  id: string;
  tenant_id: string;
  user_id: string;
  amount: number;
  fee: number;
  net_amount: number;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  status: RequestStatus;
  created_at: string;
  reviewed_at: string | null;
}

// Supabase-js typed database interface
export interface Database {
  public: {
    Tables: {
      tenants: { Row: Tenant; Insert: Partial<Tenant>; Update: Partial<Tenant> };
      users: { Row: User; Insert: Partial<User>; Update: Partial<User> };
      investment_plans: { Row: InvestmentPlan; Insert: Partial<InvestmentPlan>; Update: Partial<InvestmentPlan> };
      user_investments: { Row: UserInvestment; Insert: Partial<UserInvestment>; Update: Partial<UserInvestment> };
      transactions: { Row: Transaction; Insert: Partial<Transaction>; Update: Partial<Transaction> };
      deposit_requests: { Row: DepositRequest; Insert: Partial<DepositRequest>; Update: Partial<DepositRequest> };
      withdrawal_requests: { Row: WithdrawalRequest; Insert: Partial<WithdrawalRequest>; Update: Partial<WithdrawalRequest> };
    };
    Functions: {
      get_my_tenant_id: { Returns: string };
      get_my_role: { Returns: UserRole };
      is_tenant_admin: { Returns: boolean };
      is_superadmin: { Returns: boolean };
    };
  };
}
