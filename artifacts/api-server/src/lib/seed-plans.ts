import crypto from "node:crypto";
import { db, investmentPlansTable } from "@workspace/db";

// VIP Investment Plans — VIP 1 to VIP 9, 10%/day, 90 days
export const PLAN_SEED_DATA = [
  { name: "VIP 1", minAmount:  20_000, dailyRate: 10, durationDays: 90 },
  { name: "VIP 2", minAmount:  30_000, dailyRate: 10, durationDays: 90 },
  { name: "VIP 3", minAmount: 100_000, dailyRate: 10, durationDays: 90 },
  { name: "VIP 4", minAmount: 150_000, dailyRate: 10, durationDays: 90 },
  { name: "VIP 5", minAmount: 200_000, dailyRate: 10, durationDays: 90 },
  { name: "VIP 6", minAmount: 250_000, dailyRate: 10, durationDays: 90 },
  { name: "VIP 7", minAmount: 500_000, dailyRate: 10, durationDays: 90 },
  { name: "VIP 8", minAmount: 1_000_000, dailyRate: 10, durationDays: 90 },
  { name: "VIP 9", minAmount: 2_000_000, dailyRate: 10, durationDays: 90 },
];

// ALWAYS wipe and re-insert on every deploy — guarantees DB matches code exactly.
export async function seedInvestmentPlansIfEmpty(): Promise<void> {
  await db.delete(investmentPlansTable);
  console.log("Plans wiped — inserting VIP 1–VIP 9 (10%/day, 90 days)");
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
  console.log("✅ VIP 1–VIP 9 seeded successfully");
}
