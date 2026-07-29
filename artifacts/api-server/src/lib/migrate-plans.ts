/**
 * migrate-plans.ts
 *
 * One-shot migration: wipe ALL existing investment plans and re-insert
 * the canonical VIP 3–8 tiers. Safe to re-run — fully idempotent.
 *
 * Usage (from repo root):
 *   pnpm --filter @workspace/api-server run migrate:plans
 */

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

  // Force-delete ALL existing plans regardless of count
  const deleted = await db.delete(investmentPlansTable).returning();
  console.log(`Deleted ${deleted.length} existing plan(s):`);
  for (const p of deleted) {
    console.log(`  ✗ ${p.name}  (min ₦${Number(p.minAmount).toLocaleString()} · ${p.dailyRate}%/day · ${p.durationDays}d)`);
  }

  console.log("\nInserting VIP 3–8 plans:");
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
    console.log(
      `  ✓ ${plan.name}  deposit ₦${plan.minAmount.toLocaleString()}` +
      `  →  ₦${dailyIncome.toLocaleString()}/day  ·  ₦${totalIncome.toLocaleString()} total`,
    );
  }

  console.log("\nMigration complete ✅");
}

migratePlans()
  .then(() => process.exit(0))
  .catch((err) => { console.error("Migration failed:", err); process.exit(1); });
