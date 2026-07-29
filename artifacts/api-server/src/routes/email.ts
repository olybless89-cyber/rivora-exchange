import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import { Resend } from "resend";
import { db, usersTable } from "@workspace/db";
import { requireAuth } from "../lib/auth-middleware.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();
function getResend() { const key = process.env.RESEND_API_KEY; if (!key) return null; return new Resend(key); }
const FROM_EMAIL = process.env.EMAIL_FROM ?? "Rivora Exchange <no-reply@rivoraexchange.com>";

router.post("/admin/email/single", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "admin") { res.status(403).json({ message: "Forbidden" }); return; }
  const { userId, subject, message } = req.body as { userId?: string; subject?: string; message?: string };
  if (!userId || !subject || !message) { res.status(400).json({ message: "userId, subject, and message are required" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ message: "User not found" }); return; }
  const email = (user as any).email as string | undefined;
  if (!email) { res.status(400).json({ message: "This user has no email address on file" }); return; }
  const resend = getResend();
  if (!resend) { res.status(503).json({ message: "RESEND_API_KEY not configured" }); return; }
  try { await resend.emails.send({ from: FROM_EMAIL, to: email, subject, html: message.replace(/\n/g, "<br>") }); logger.info({ to: email, subject }, "Single email sent"); res.json({ sent: 1 }); }
  catch (err: any) { logger.error({ err }, "Failed to send email"); res.status(500).json({ message: err?.message ?? "Failed to send email" }); }
});

router.post("/admin/email/bulk", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "admin") { res.status(403).json({ message: "Forbidden" }); return; }
  const { subject, message, userIds } = req.body as { subject?: string; message?: string; userIds?: string[] };
  if (!subject || !message) { res.status(400).json({ message: "subject and message are required" }); return; }
  const resend = getResend();
  if (!resend) { res.status(503).json({ message: "RESEND_API_KEY not configured" }); return; }
  const users = userIds?.length ? await db.select().from(usersTable).where(inArray(usersTable.id, userIds)) : await db.select().from(usersTable);
  const targets = users.filter((u) => !!(u as any).email);
  if (targets.length === 0) { res.status(400).json({ message: "No users with email addresses found" }); return; }
  let sent = 0; let failed = 0;
  for (const u of targets) {
    try { await resend.emails.send({ from: FROM_EMAIL, to: (u as any).email as string, subject, html: message.replace(/\n/g, "<br>") }); sent++; }
    catch (err) { logger.error({ err, userId: u.id }, "Bulk email failed"); failed++; }
  }
  logger.info({ sent, failed, subject }, "Bulk email complete");
  res.json({ sent, failed, total: targets.length });
});

export default router;
