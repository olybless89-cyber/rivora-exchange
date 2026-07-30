import { db, investmentPlansTable } from "@workspace/db";
import crypto from "node:crypto";

const VIP_PLANS = [
  { name: "VIP 1", minAmount:  20_000, dailyRate: 10, durationDays: 90 },
  { name: "VIP 2", minAmount:  30_000, dailyRate: 10, durationDays: 90 },
  { name: "VIP 3", minAmount: 100_000, dailyRate: 10, durationDays: 90 },
  { name: "VIP 4", minAmount: 150_000, dailyRate: 10, durationDays: 90 },
  { name: "VIP 5", minAmount: 200_000, dailyRate: 10, durationDays: 90 },
  { name: "VIP 6", minAmount: 250_000, dailyRate: 10, durationDays: 90 },
  { name: "VIP 7", minAmount: 500_000, dailyRate: 10, durationDays: 90 },
  { name: "VIP 8", minAmount: 1_000_000, dailyRate: 10, durationDays: 90 },
  { name: "VIP 9", minAmount: 2_000_000, dailyRate: 10, durationDays: 90 },
] as const;

async function migratePlans(): Promise<void> {
  console.log("=== Rivora VIP investment-plan migration ===\n");
  const deleted = await db.delete(investmentPlansTable).returning();
  console.log(`Deleted ${deleted.length} existing plan(s)`);
  console.log("\nInserting VIP 1–VIP 9 plans (10%/day, 90 days):");
  for (const plan of VIP_PLANS) {
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
