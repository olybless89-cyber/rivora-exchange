import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import { db, usersTable, investmentPlansTable, userInvestmentsTable, transactionsTable } from "@workspace/db";
import { CreateInvestmentRequest } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth-middleware.js";
import { generateReference } from "../lib/reference.js";

const router: IRouter = Router();

router.get("/investments", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req.query as Record<string, string | undefined>;

  // Non-admins can only ever see their own investments, regardless of what
  // userId they pass.
  const effectiveUserId = req.user!.role === "admin" ? userId ?? req.user!.id : req.user!.id;

  const investments = await db
    .select()
    .from(userInvestmentsTable)
    .where(eq(userInvestmentsTable.userId, effectiveUserId))
    .orderBy(userInvestmentsTable.createdAt);

  res.json(investments);
});

router.post("/investments", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateInvestmentRequest.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.message });
    return;
  }

  const [plan] = await db
    .select()
    .from(investmentPlansTable)
    .where(eq(investmentPlansTable.id, parsed.data.planId));

  if (!plan || !plan.isActive) {
    res.status(400).json({ message: "Investment plan not found or no longer available" });
    return;
  }

  const amount = parsed.data.amount;
  if (amount < Number(plan.minAmount)) {
    res.status(400).json({ message: `Minimum investment for ${plan.name} is ₦${Number(plan.minAmount).toLocaleString()}` });
    return;
  }

  const currentBalance = Number(req.user!.balance);
  if (amount > currentBalance) {
    res.status(400).json({ message: "Insufficient balance" });
    return;
  }

  const now = new Date();
  const endDate = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

  const investment = await db.transaction(async (tx) => {
    const [inv] = await tx
      .insert(userInvestmentsTable)
      .values({
        id: crypto.randomUUID(),
        userId: req.user!.id,
        planId: plan.id,
        planName: plan.name,
        amount: String(amount),
        dailyRate: plan.dailyRate,
        startDate: now,
        endDate,
        status: "active",
      })
      .returning();

    await tx
      .update(usersTable)
      .set({ balance: String(currentBalance - amount), updatedAt: new Date() })
      .where(eq(usersTable.id, req.user!.id));

    await tx.insert(transactionsTable).values({
      id: crypto.randomUUID(),
      userId: req.user!.id,
      type: "investment",
      amount: String(amount),
      status: "completed",
      reference: generateReference(),
      description: `Invested in ${plan.name}`,
    });

    return inv;
  });

  res.status(201).json(investment);
});

export default router;
