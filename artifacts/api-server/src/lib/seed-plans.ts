import crypto from "node:crypto";
import { db, investmentPlansTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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

// Insert plans that don't exist (preserves existing plans with user investments)
export async function seedInvestmentPlansIfEmpty(): Promise<void> {
  for (const plan of PLAN_SEED_DATA) {
    const [existing] = await db
      .select()
      .from(investmentPlansTable)
      .where(eq(investmentPlansTable.name, plan.name));

    if (!existing) {
      await db.insert(investmentPlansTable).values({
        id: crypto.randomUUID(),
        name: plan.name,
        dailyRate: String(plan.dailyRate),
        minAmount: String(plan.minAmount),
        durationDays: plan.durationDays,
        isActive: true,
      });
      console.log(`✅ Inserted ${plan.name}`);
    } else {
      console.log(`⏭️  ${plan.name} already exists, skipping`);
    }
  }
  console.log("✅ VIP 1–VIP 9 seeding complete");
}
