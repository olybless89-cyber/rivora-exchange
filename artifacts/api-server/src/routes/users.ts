import { Router, type IRouter } from "express";
import { and, eq, ilike, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { updateUserBody, updateMyBankDetailsBody } from "@workspace/api-zod";
import { toPublicUser } from "../lib/serializers.js";
import { requireAuth, requireAdmin } from "../lib/auth-middleware.js";

const router: IRouter = Router();

router.patch("/users/me/bank", requireAuth, async (req, res): Promise<void> => {
  const parsed = updateMyBankDetailsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({
      bankName: parsed.data.bankName,
      bankAccountNumber: parsed.data.bankAccountNumber,
      bankAccountName: parsed.data.bankAccountName,
      updatedAt: new Date(),
    })
    .where(eq(usersTable.id, req.user!.id))
    .returning();

  res.json(toPublicUser(updated));
});

router.get("/users", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const { search, status, role } = req.query as Record<string, string | undefined>;

  let query = db.select().from(usersTable).$dynamic();

  const conditions = [];
  if (search) {
    conditions.push(or(ilike(usersTable.fullName, `%${search}%`), ilike(usersTable.phone, `%${search}%`)));
  }
  if (status) conditions.push(eq(usersTable.status, status as "active" | "inactive"));
  if (role) conditions.push(eq(usersTable.role, role as "user" | "admin"));
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const users = await query.orderBy(usersTable.createdAt);
  res.json(users.map(toPublicUser));
});

router.get("/users/:userId", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  res.json(toPublicUser(user));
});

router.patch("/users/:userId", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;

  const parsed = updateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.message });
    return;
  }

  const updates: Partial<typeof usersTable.$inferInsert> = { updatedAt: new Date() };
  if (parsed.data.role !== undefined) updates.role = parsed.data.role;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.balance !== undefined) updates.balance = String(parsed.data.balance);
  if (parsed.data.newPassword) {
    updates.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    updates.mustChangePassword = true;
  }

  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, userId)).returning();

  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  req.log?.info?.({ userId }, "User updated");
  res.json(toPublicUser(user));
});

export default router;
