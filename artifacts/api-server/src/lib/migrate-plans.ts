import { db, investmentPlansTable } from "@workspace/db";
import crypto from "node:crypto";

const VIP_PLANS = [
  { name: "VIP 3", minAmount: 20_000,  dailyRate: 27.5,    durationDays: 100 },
  { name: "VIP 4", minAmount: 40_000,  dailyRate: 26.25,   durationDays: 100 },
  { name: "VIP 5", minAmount: 80_000,  dailyRate: 25.25,   durationDays: 100 },
  { name: "VIP 6", minAmount: 160_000, dailyRate: 25.3125, durationDays: 100 },
  { name: "VIP 7", minAmount: 320_000, dailyRate: 29.6875, durationDays: 100 },
  { name: "VIP 8", minAmount: 640_000, dailyRate: 26.5625, durationDays: 100 },
] as const;

async function migratePlans(): Promise<void> {
  console.log("=== Rivora investment-plan migration ===\n");
  const deleted = await db.delete(investmentPlansTable).returning();
  console.log(`Deleted ${deleted.length} existing plan(s)`);
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
