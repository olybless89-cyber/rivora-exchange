import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { generateReferralCode } from "./lib/reference.js";
import { seedInvestmentPlansIfEmpty } from "./lib/seed-plans.js";
import { logger } from "./lib/logger.js";
import app from "./app.js";

const rawPort = process.env.PORT;
// Render injects PORT automatically; fall back to 4000 in other environments
const port = Number(rawPort ?? "4000");
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Default handover admin account -- change this password after first login
// (the app forces a change via mustChangePassword). Upserted on every
// startup so it stays valid across redeploys until changed.
const ADMIN_PHONE = "+2348000000001";
const ADMIN_PASSWORD = "Rivora2025!";

async function bootstrap(): Promise<void> {
  try {
    const [existingAdmin] = await db.select().from(usersTable).where(eq(usersTable.phone, ADMIN_PHONE));

    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
      await db.insert(usersTable).values({
        id: crypto.randomUUID(),
        phone: ADMIN_PHONE,
        passwordHash,
        fullName: "Admin",
        role: "admin",
        status: "active",
        balance: "0",
        referralCode: generateReferralCode(),
        referredBy: null,
        hasReceivedWelcomeBonus: true,
        mustChangePassword: true,
      });
      logger.info("Admin account created");
    }

    await seedInvestmentPlansIfEmpty();
    logger.info("Bootstrap OK");
  } catch (err) {
    logger.error({ err }, "Bootstrap failed -- continuing anyway");
  }
}

bootstrap().then(() => {
  app.listen(port, () => {
    logger.info(`Rivora Exchange API listening on port ${port}`);
  });
});
