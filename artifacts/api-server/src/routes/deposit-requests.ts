import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import crypto from "node:crypto";
import { db, usersTable, depositRequestsTable, transactionsTable } from "@workspace/db";
import { CreateDepositRequestBody, UpdateRequestStatusBody } from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../lib/auth-middleware.js";
import { generateReference } from "../lib/reference.js";

const MIN_DEPOSIT = 10_000;
const WELCOME_BONUS = 2_000;

const router: IRouter = Router();

router.get("/deposit-requests", requireAuth, async (req, res): Promise<void> => {
  const { userId, status } = req.query as Record<string, string | undefined>;
  const isAdmin = req.user!.role === "admin";
  const effectiveUserId = isAdmin ? userId : req.user!.id;

  const conditions = [];
  if (effectiveUserId) conditions.push(eq(depositRequestsTable.userId, effectiveUserId));
  if (status) conditions.push(eq(depositRequestsTable.status, status as "pending" | "approved" | "rejected"));

  let query = db.select().from(depositRequestsTable).$dynamic();
  if (conditions.length > 0) query = query.where(and(...conditions));

  const requests = await query.orderBy(depositRequestsTable.createdAt);
  res.json(requests);
});

router.post("/deposit-requests", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateDepositRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.message });
    return;
  }

  if (parsed.data.amount < MIN_DEPOSIT) {
    res.status(400).json({ message: `Minimum deposit is ₦${MIN_DEPOSIT.toLocaleString()}` });
    return;
  }

  const [request] = await db
    .insert(depositRequestsTable)
    .values({
      id: crypto.randomUUID(),
      userId: req.user!.id,
      amount: String(parsed.data.amount),
      paymentMethod: parsed.data.paymentMethod,
      proofUrl: parsed.data.proofUrl ?? null,
      status: "pending",
    })
    .returning();

  res.status(201).json(request);
});

router.patch("/deposit-requests/:requestId", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const requestId = Array.isArray(req.params.requestId) ? req.params.requestId[0] : req.params.requestId;

  const parsed = UpdateRequestStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(depositRequestsTable).where(eq(depositRequestsTable.id, requestId));
  if (!existing) {
    res.status(404).json({ message: "Deposit request not found" });
    return;
  }

  const wasAlreadyReviewed = existing.status !== "pending";

  const updated = await db.transaction(async (tx) => {
    const [request] = await tx
      .update(depositRequestsTable)
      .set({ status: parsed.data.status, reviewedAt: new Date() })
      .where(eq(depositRequestsTable.id, requestId))
      .returning();

    // Only credit the balance (and welcome bonus) the first time a request
    // transitions into "approved" -- re-saving an already-approved request
    // must never double-credit.
    if (!wasAlreadyReviewed && parsed.data.status === "approved") {
      const [user] = await tx.select().from(usersTable).where(eq(usersTable.id, request.userId));
      if (user) {
        const depositAmount = Number(request.amount);
        let newBalance = Number(user.balance) + depositAmount;

        await tx.insert(transactionsTable).values({
          id: crypto.randomUUID(),
          userId: user.id,
          type: "deposit",
          amount: String(depositAmount),
          status: "completed",
          reference: generateReference(),
          description: `Deposit via ${request.paymentMethod}`,
        });

        const shouldCreditWelcomeBonus = !user.hasReceivedWelcomeBonus;
        if (shouldCreditWelcomeBonus) {
          newBalance += WELCOME_BONUS;
          await tx.insert(transactionsTable).values({
            id: crypto.randomUUID(),
            userId: user.id,
            type: "bonus",
            amount: String(WELCOME_BONUS),
            status: "completed",
            reference: generateReference(),
            description: "Welcome bonus (first deposit)",
          });
        }

        await tx
          .update(usersTable)
          .set({
            balance: String(newBalance),
            hasReceivedWelcomeBonus: shouldCreditWelcomeBonus ? true : user.hasReceivedWelcomeBonus,
            updatedAt: new Date(),
          })
          .where(eq(usersTable.id, user.id));
      }
    }

    return request;
  });

  res.json(updated);
});

export default router;
