import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, appSettingsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth-middleware.js";

const router: IRouter = Router();

router.get("/settings/:key", async (req, res): Promise<void> => {
  const { key } = req.params;
  const [row] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, key));
  res.json({ key, value: row?.value ?? null });
});

router.put("/settings/:key", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "admin") { res.status(403).json({ message: "Forbidden" }); return; }
  const { key } = req.params;
  const { value } = req.body as { value?: string };
  if (typeof value !== "string") { res.status(400).json({ message: "value is required" }); return; }
  await db.insert(appSettingsTable).values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSettingsTable.key, set: { value, updatedAt: new Date() } });
  res.json({ key, value });
});

export default router;
