import crypto from "node:crypto";
import { db, investmentPlansTable } from "@workspace/db";

export const PLAN_SEED_DATA = [
  { name: "VIP 3", minAmount: 20_000,  dailyRate: 27.5,    durationDays: 100 },
  { name: "VIP 4", minAmount: 40_000,  dailyRate: 26.25,   durationDays: 100 },
  { name: "VIP 5", minAmount: 80_000,  dailyRate: 25.25,   durationDays: 100 },
  { name: "VIP 6", minAmount: 160_000, dailyRate: 25.3125, durationDays: 100 },
  { name: "VIP 7", minAmount: 320_000, dailyRate: 29.6875, durationDays: 100 },
  { name: "VIP 8", minAmount: 640_000, dailyRate: 26.5625, durationDays: 100 },
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
