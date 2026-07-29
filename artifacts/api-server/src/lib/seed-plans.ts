import crypto from "node:crypto";
import { db, investmentPlansTable } from "@workspace/db";

// Exact plans matching reference image — RIVO-LV1 to LV10, 5%/day, 90 days
export const PLAN_SEED_DATA = [
  { name: "RIVO-LV1",  minAmount:  20_000, dailyRate: 5, durationDays: 90 },
  { name: "RIVO-LV2",  minAmount:  50_000, dailyRate: 5, durationDays: 90 },
  { name: "RIVO-LV3",  minAmount:  80_000, dailyRate: 5, durationDays: 90 },
  { name: "RIVO-LV4",  minAmount: 120_000, dailyRate: 5, durationDays: 90 },
  { name: "RIVO-LV5",  minAmount: 150_000, dailyRate: 5, durationDays: 90 },
  { name: "RIVO-LV6",  minAmount: 180_000, dailyRate: 5, durationDays: 90 },
  { name: "RIVO-LV7",  minAmount: 220_000, dailyRate: 5, durationDays: 90 },
  { name: "RIVO-LV8",  minAmount: 250_000, dailyRate: 5, durationDays: 90 },
  { name: "RIVO-LV9",  minAmount: 500_000, dailyRate: 5, durationDays: 90 },
  { name: "RIVO-LV10", minAmount: 890_000, dailyRate: 5, durationDays: 90 },
];

// ALWAYS wipe and re-insert on every deploy — guarantees DB matches code exactly.
export async function seedInvestmentPlansIfEmpty(): Promise<void> {
  await db.delete(investmentPlansTable);
  console.log("Plans wiped — inserting RIVO-LV1–LV10 (5%/day, 90 days)");
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
  console.log("✅ RIVO-LV1–LV10 seeded successfully");
}
