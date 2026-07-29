import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import crypto from "node:crypto";
import { db, usersTable, withdrawalRequestsTable, transactionsTable } from "@workspace/db";
import { createWithdrawalRequestBody, updateWithdrawalRequestBody } from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../lib/auth-middleware.js";
import { generateReference } from "../lib/reference.js";
import { isWithinWithdrawalWindow } from "../lib/withdrawal-window.js";

const MIN_WITHDRAWAL = 10_000;
const WITHDRAWAL_FEE_RATE = 0.2;

const router: IRouter = Router();

router.get("/withdrawal-requests", requireAuth, async (req, res): Promise<void> => {
  const { userId, status } = req.query as Record<string, string | undefined>;
  const isAdmin = req.user!.role === "admin";
  const effectiveUserId = isAdmin ? userId : req.user!.id;

  const conditions = [];
  if (effectiveUserId) conditions.push(eq(withdrawalRequestsTable.userId, effectiveUserId));
  if (status) conditions.push(eq(withdrawalRequestsTable.status, status as "pending" | "approved" | "rejected"));

  let query = db.select().from(withdrawalRequestsTable).$dynamic();
  if (conditions.length > 0) query = query.where(and(...conditions));

  const requests = await query.orderBy(withdrawalRequestsTable.createdAt);
  res.json(requests);
});

router.post("/withdrawal-requests", requireAuth, async (req, res): Promise<void> => {
  const parsed = createWithdrawalRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.message });
    return;
  }

  if (!isWithinWithdrawalWindow()) {
    res.status(400).json({
      message: "Withdrawals are only available 7:00 PM - 11:00 PM (Nigeria time), Monday to Saturday.",
    });
    return;
  }

  const amount = parsed.data.amount;
  if (amount < MIN_WITHDRAWAL) {
    res.status(400).json({ message: `Minimum withdrawal is ₦${MIN_WITHDRAWAL.toLocaleString()}` });
    return;
  }

  const currentBalance = Number(req.user!.balance);
  if (amount > currentBalance) {
    res.status(400).json({ message: "Insufficient balance" });
    return;
  }

  const fee = Math.round(amount * WITHDRAWAL_FEE_RATE * 100) / 100;
  const netAmount = amount - fee;

  const [request] = await db
    .insert(withdrawalRequestsTable)
    .values({
      id: crypto.randomUUID(),
      userId: req.user!.id,
      amount: String(amount),
      fee: String(fee),
      netAmount: String(netAmount),
      bankName: parsed.data.bankName,
      bankAccountNumber: parsed.data.bankAccountNumber,
      bankAccountName: parsed.data.bankAccountName,
      status: "pending",
    })
    .returning();

  res.status(201).json(request);
});

router.patch("/withdrawal-requests/:requestId", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const requestId = Array.isArray(req.params.requestId) ? req.params.requestId[0] : req.params.requestId;

  const parsed = updateWithdrawalRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(withdrawalRequestsTable).where(eq(withdrawalRequestsTable.id, requestId));
  if (!existing) {
    res.status(404).json({ message: "Withdrawal request not found" });
    return;
  }

  const wasAlreadyReviewed = existing.status !== "pending";

  const updated = await db.transaction(async (tx) => {
    const [request] = await tx
      .update(withdrawalRequestsTable)
      .set({ status: parsed.data.status, reviewedAt: new Date() })
      .where(eq(withdrawalRequestsTable.id, requestId))
      .returning();

    // Balance is only deducted once, the first time a request transitions
    // into "approved" -- the deduction happens on approval (not at request
    // time) so a rejected withdrawal never touches the user's balance.
    if (!wasAlreadyReviewed && parsed.data.status === "approved") {
      const [user] = await tx.select().from(usersTable).where(eq(usersTable.id, request.userId));
      if (user) {
        const amount = Number(request.amount);
        const newBalance = Math.max(0, Number(user.balance) - amount);

        await tx
          .update(usersTable)
          .set({ balance: String(newBalance), updatedAt: new Date() })
          .where(eq(usersTable.id, user.id));

        await tx.insert(transactionsTable).values({
          id: crypto.randomUUID(),
          userId: user.id,
          type: "withdrawal",
          amount: String(amount),
          status: "completed",
          reference: generateReference(),
          description: `Withdrawal to ${request.bankName} (${request.bankAccountNumber}) -- net ₦${Number(request.netAmount).toLocaleString()} after 20% fee`,
        });
      }
    }

    return request;
  });

  res.json(updated);
});

export default router;
