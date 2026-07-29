import crypto from "node:crypto";
import { db, investmentPlansTable } from "@workspace/db";

// 6 VIP investment tiers sourced from the updated plan schedule.
// Daily income and total income per tier:
//   VIP 3:  ₦20,000  →  ₦5,500/day   · ₦550,000  total (100 days)
//   VIP 4:  ₦40,000  →  ₦10,500/day  · ₦1,050,000 total (100 days)
//   VIP 5:  ₦80,000  →  ₦20,200/day  · ₦2,020,000 total (100 days)
//   VIP 6:  ₦160,000 →  ₦40,500/day  · ₦4,050,000 total (100 days)
//   VIP 7:  ₦320,000 →  ₦95,000/day  · ₦8,500,000 total (100 days)
//   VIP 8:  ₦640,000 →  ₦170,000/day · ₦17,000,000 total (100 days)
export const PLAN_SEED_DATA = [
  { name: "VIP 3", minAmount: 20_000,  dailyRate: 27.5,     durationDays: 100 },
  { name: "VIP 4", minAmount: 40_000,  dailyRate: 26.25,    durationDays: 100 },
  { name: "VIP 5", minAmount: 80_000,  dailyRate: 25.25,    durationDays: 100 },
  { name: "VIP 6", minAmount: 160_000, dailyRate: 25.3125,  durationDays: 100 },
  { name: "VIP 7", minAmount: 320_000, dailyRate: 29.6875,  durationDays: 100 },
  { name: "VIP 8", minAmount: 640_000, dailyRate: 26.5625,  durationDays: 100 },
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