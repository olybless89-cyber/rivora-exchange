import { db, investmentPlansTable } from "@workspace/db";
import crypto from "node:crypto";

const RIVO_PLANS = [
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
] as const;

async function migratePlans(): Promise<void> {
  console.log("=== Rivora investment-plan migration ===\n");
  const deleted = await db.delete(investmentPlansTable).returning();
  console.log(`Deleted ${deleted.length} existing plan(s)`);
  console.log("\nInserting RIVO-LV1–LV10 plans:");
  for (const plan of RIVO_PLANS) {
    const dailyIncome = (plan.minAmount * plan.dailyRate) / 100;
    const totalIncome = dailyIncome * plan.durationDays;
    await db.insert(investmentPlansTable).values({
      id: crypto.randomUUID(),
      name: plan.name,
      dailyRate: String(plan.dailyRate),
      minAmount: String(plan.minAmount),
      durationDays: plan.durationDays,
      isActive: true,
    });
    console.log(`  ✓ ${plan.name}  ₦${plan.minAmount.toLocaleString()} → ₦${dailyIncome.toLocaleString()}/day · ₦${totalIncome.toLocaleString()} total`);
  }
  console.log("\nMigration complete ✅");
}

migratePlans().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
