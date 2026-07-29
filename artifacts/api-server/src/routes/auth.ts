import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { db, usersTable } from "@workspace/db";
import { registerBody, loginBody, changePasswordBody } from "@workspace/api-zod";
import { signToken } from "../lib/jwt.js";
import { generateReferralCode } from "../lib/reference.js";
import { toPublicUser } from "../lib/serializers.js";
import { requireAuth } from "../lib/auth-middleware.js";

const router: IRouter = Router();

function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.startsWith("234")) return `+${digits}`;
  if (digits.startsWith("0")) return `+234${digits.slice(1)}`;
  return `+234${digits}`;
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = registerBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: parsed.error.message }); return; }

  const { phone, password, confirmPassword, fullName, referralCode } = parsed.data;
  if (password !== confirmPassword) { res.status(400).json({ message: "Passwords do not match" }); return; }

  // Referral code is COMPULSORY
  if (!referralCode || referralCode.trim() === "") {
    res.status(400).json({ message: "A referral code is required to register. Join our Telegram group to get one." });
    return;
  }

  const [referrer] = await db.select().from(usersTable).where(eq(usersTable.referralCode, referralCode.trim().toUpperCase()));
  if (!referrer) {
    res.status(400).json({ message: "Invalid referral code. Please check with the person who invited you." });
    return;
  }

  const normalizedPhone = normalizePhone(phone);
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.phone, normalizedPhone));
  if (existing) { res.status(400).json({ message: "An account with this phone number already exists" }); return; }

  const passwordHash = await bcrypt.hash(password, 12);
  let ownReferralCode = generateReferralCode();
  for (let i = 0; i < 5; i++) {
    const [clash] = await db.select().from(usersTable).where(eq(usersTable.referralCode, ownReferralCode));
    if (!clash) break;
    ownReferralCode = generateReferralCode();
  }

  const id = crypto.randomUUID();
  const [user] = await db.insert(usersTable).values({
    id, phone: normalizedPhone, passwordHash, fullName,
    role: "user", status: "active", balance: "0",
    referralCode: ownReferralCode, referredBy: referrer.id,
    hasReceivedWelcomeBonus: false,
  }).returning();

  const token = signToken(user.id);
  res.status(201).json({ user: toPublicUser(user), token });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = loginBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: parsed.error.message }); return; }

  const normalizedPhone = normalizePhone(parsed.data.phone);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.phone, normalizedPhone));
  if (!user) { res.status(401).json({ message: "Invalid phone number or password" }); return; }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) { res.status(401).json({ message: "Invalid phone number or password" }); return; }
  if (user.status === "inactive") { res.status(403).json({ message: "Account deactivated. Contact support." }); return; }

  const token = signToken(user.id);
  res.status(200).json({ user: toPublicUser(user), token });
});

router.post("/auth/logout", async (_req, res): Promise<void> => { res.status(204).send(); });

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => { res.json(toPublicUser(req.user!)); });

router.post("/auth/change-password", requireAuth, async (req, res): Promise<void> => {
  const parsed = changePasswordBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: parsed.error.message }); return; }

  const valid = await bcrypt.compare(parsed.data.currentPassword, req.user!.passwordHash);
  if (!valid) { res.status(400).json({ message: "Current password is incorrect" }); return; }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  const [updated] = await db.update(usersTable).set({ passwordHash, mustChangePassword: false, updatedAt: new Date() }).where(eq(usersTable.id, req.user!.id)).returning();
  res.json(toPublicUser(updated));
});

export default router;
