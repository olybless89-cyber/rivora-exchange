import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  numeric,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const userStatusEnum = pgEnum("user_status", ["active", "inactive"]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "deposit",
  "withdrawal",
  "investment",
  "bonus",
  "referral_bonus",
]);
export const transactionStatusEnum = pgEnum("transaction_status", [
  "pending",
  "completed",
  "rejected",
]);

export const requestStatusEnum = pgEnum("request_status", [
  "pending",
  "approved",
  "rejected",
]);

export const investmentStatusEnum = pgEnum("investment_status", [
  "active",
  "completed",
]);

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
// Registration is phone + password only (no email). Full name is collected
// too (used for the Dashboard welcome message and Profile page) even though
// the source spec's Register page field list didn't call it out explicitly
// alongside phone/password/confirm/referral -- Dashboard ("Welcome message
// with user name") and Profile ("User Info Display") both need it, so it's
// treated as a required registration field here.

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull().unique(), // stored with +234 prefix
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  role: userRoleEnum("role").notNull().default("user"),
  status: userStatusEnum("status").notNull().default("active"),
  balance: numeric("balance", { precision: 14, scale: 2 }).notNull().default("0"),
  referralCode: varchar("referral_code", { length: 20 }).notNull().unique(),
  referredBy: uuid("referred_by"), // self-reference to another user's id, nullable
  hasReceivedWelcomeBonus: boolean("has_received_welcome_bonus").notNull().default(false),
  bankName: text("bank_name"),
  bankAccountNumber: varchar("bank_account_number", { length: 20 }),
  bankAccountName: text("bank_account_name"),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Investment plans (admin-managed; seeded with VIP 3–8 tiers)
// Run `pnpm --filter @workspace/api-server tsx src/lib/migrate-plans.ts`
// to replace all plans in a live database without restarting the server.
// ---------------------------------------------------------------------------

export const investmentPlansTable = pgTable("investment_plans", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(), // e.g. "RIVO-LV1"
  dailyRate: numeric("daily_rate", { precision: 5, scale: 2 }).notNull(), // percent, e.g. 2.50
  minAmount: numeric("min_amount", { precision: 14, scale: 2 }).notNull(),
  durationDays: integer("duration_days").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// User investments
// ---------------------------------------------------------------------------

export const userInvestmentsTable = pgTable("user_investments", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  planId: uuid("plan_id").notNull().references(() => investmentPlansTable.id),
  planName: text("plan_name").notNull(), // snapshot, in case plan is edited/deleted later
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  dailyRate: numeric("daily_rate", { precision: 5, scale: 2 }).notNull(), // snapshot
  startDate: timestamp("start_date").notNull().defaultNow(),
  endDate: timestamp("end_date").notNull(),
  status: investmentStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Transactions (unified ledger: deposits, withdrawals, investments, bonuses)
// ---------------------------------------------------------------------------

export const transactionsTable = pgTable("transactions", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  type: transactionTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  status: transactionStatusEnum("status").notNull().default("completed"),
  reference: varchar("reference", { length: 40 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Deposit requests (admin-approved before balance is credited)
// ---------------------------------------------------------------------------

export const depositRequestsTable = pgTable("deposit_requests", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(),
  proofUrl: text("proof_url"),
  status: requestStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

// ---------------------------------------------------------------------------
// Withdrawal requests (admin-approved; fee/net computed at submission time)
// ---------------------------------------------------------------------------

export const withdrawalRequestsTable = pgTable("withdrawal_requests", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  fee: numeric("fee", { precision: 14, scale: 2 }).notNull(),
  netAmount: numeric("net_amount", { precision: 14, scale: 2 }).notNull(),
  bankName: text("bank_name").notNull(),
  bankAccountNumber: varchar("bank_account_number", { length: 20 }).notNull(),
  bankAccountName: text("bank_account_name").notNull(),
  status: requestStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

// ---------------------------------------------------------------------------
// App settings (key-value store for platform-wide configuration)
// ---------------------------------------------------------------------------

export const appSettingsTable = pgTable("app_settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
