import crypto from "node:crypto";
import { db, investmentPlansTable } from "@workspace/db";

// The 10 RIVO-LV investment tiers. Only minAmount was specified by name;
// dailyRate and durationDays are reasonable starting defaults -- both are
// freely editable afterwards from Admin > Investment Plans, nothing here is
// hardcoded into the app logic itself.
export const PLAN_SEED_DATA = [
  { name: "RIVO-LV1", minAmount: 20_000, dailyRate: 2.0, durationDays: 30 },
  { name: "RIVO-LV2", minAmount: 50_000, dailyRate: 2.2, durationDays: 30 },
  { name: "RIVO-LV3", minAmount: 80_000, dailyRate: 2.4, durationDays: 30 },
  { name: "RIVO-LV4", minAmount: 120_000, dailyRate: 2.6, durationDays: 30 },
  { name: "RIVO-LV5", minAmount: 150_000, dailyRate: 2.8, durationDays: 30 },
  { name: "RIVO-LV6", minAmount: 180_000, dailyRate: 3.0, durationDays: 30 },
  { name: "RIVO-LV7", minAmount: 220_000, dailyRate: 3.2, durationDays: 30 },
  { name: "RIVO-LV8", minAmount: 250_000, dailyRate: 3.4, durationDays: 30 },
  { name: "RIVO-LV9", minAmount: 500_000, dailyRate: 3.7, durationDays: 30 },
  { name: "RIVO-LV10", minAmount: 890_000, dailyRate: 4.0, durationDays: 30 },
];

export async function seedInvestmentPlansIfEmpty(): Promise<void> {
  const existing = await db.select().from(investmentPlansTable).limit(1);
  if (existing.length > 0) return;

  for (const plan of PLAN_SEED_DATA) {
    await db.insert(investmentPlansTable).values({
      id: crypto.randomUUID(),
      name: plan.name,
      dailyRate: String(plan.dailyRate),
      minAmount: String(plan.minAmount),
      durationDays: plan.durationDays,
      isActive: true,
    });
  }
}
