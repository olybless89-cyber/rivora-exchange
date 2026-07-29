import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, transactionsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth-middleware.js";

const router: IRouter = Router();

router.get("/transactions", requireAuth, async (req, res): Promise<void> => {
  const { userId, type } = req.query as Record<string, string | undefined>;
  const isAdmin = req.user!.role === "admin";
  const effectiveUserId = isAdmin ? userId : req.user!.id;

  const conditions = [];
  if (effectiveUserId) conditions.push(eq(transactionsTable.userId, effectiveUserId));
  if (type) conditions.push(eq(transactionsTable.type, type as "deposit" | "withdrawal" | "investment" | "bonus"));

  let query = db.select().from(transactionsTable).$dynamic();
  if (conditions.length > 0) query = query.where(and(...conditions));

  const transactions = await query.orderBy(desc(transactionsTable.createdAt));
  res.json(transactions);
});

export default router;
