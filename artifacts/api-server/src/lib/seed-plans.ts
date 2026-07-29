import crypto from "node:crypto";
import { db, investmentPlansTable } from "@workspace/db";

// RIVO-LV1–LV10  |  5% daily  |  90-day duration
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

export async function seedInvestmentPlansIfEmpty(): Promise<void> {
  const existing = await db.select().from(investmentPlansTable).limit(1);
  const needsMigration = existing.length === 0 || !existing[0].name.startsWith("RIVO-LV");
  if (!needsMigration) return;
  await db.delete(investmentPlansTable);
  console.log("Auto-migration: replacing plans with RIVO-LV1–LV10");
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
  console.log("Investment plans seeded: RIVO-LV1–LV10 ✅");
}
