import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import crypto from "node:crypto";
import { db, investmentPlansTable } from "@workspace/db";
import { CreateInvestmentPlanRequest, UpdateInvestmentPlanRequest } from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../lib/auth-middleware.js";

const router: IRouter = Router();

router.get("/investment-plans", requireAuth, async (req, res): Promise<void> => {
  const { activeOnly } = req.query as Record<string, string | undefined>;

  let query = db.select().from(investmentPlansTable).$dynamic();
  if (activeOnly === "true") {
    query = query.where(eq(investmentPlansTable.isActive, true));
  }

  const plans = await query.orderBy(investmentPlansTable.minAmount);
  res.json(plans);
});

router.post("/investment-plans", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateInvestmentPlanRequest.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.message });
    return;
  }

  const [plan] = await db
    .insert(investmentPlansTable)
    .values({
      id: crypto.randomUUID(),
      name: parsed.data.name,
      dailyRate: String(parsed.data.dailyRate),
      minAmount: String(parsed.data.minAmount),
      durationDays: parsed.data.durationDays,
      isActive: parsed.data.isActive ?? true,
    })
    .returning();

  res.status(201).json(plan);
});

router.patch("/investment-plans/:planId", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const planId = Array.isArray(req.params.planId) ? req.params.planId[0] : req.params.planId;

  const parsed = UpdateInvestmentPlanRequest.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.message });
    return;
  }

  const updates: Partial<typeof investmentPlansTable.$inferInsert> = { updatedAt: new Date() };
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.dailyRate !== undefined) updates.dailyRate = String(parsed.data.dailyRate);
  if (parsed.data.minAmount !== undefined) updates.minAmount = String(parsed.data.minAmount);
  if (parsed.data.durationDays !== undefined) updates.durationDays = parsed.data.durationDays;
  if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive;

  const [plan] = await db
    .update(investmentPlansTable)
    .set(updates)
    .where(eq(investmentPlansTable.id, planId))
    .returning();

  if (!plan) {
    res.status(404).json({ message: "Investment plan not found" });
    return;
  }

  res.json(plan);
});

router.delete("/investment-plans/:planId", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const planId = Array.isArray(req.params.planId) ? req.params.planId[0] : req.params.planId;

  const [plan] = await db
    .delete(investmentPlansTable)
    .where(eq(investmentPlansTable.id, planId))
    .returning();

  if (!plan) {
    res.status(404).json({ message: "Investment plan not found" });
    return;
  }

  res.status(204).send();
});

export default router;
