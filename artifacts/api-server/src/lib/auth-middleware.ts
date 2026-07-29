import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { verifyToken } from "./jwt.js";

// Augment Express's Request type with the authenticated user, populated by
// requireAuth below.
declare global {
  namespace Express {
    interface Request {
      user?: typeof usersTable.$inferSelect;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ message: "Invalid or expired session" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.sub));
  if (!user) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  if (user.status === "inactive") {
    res.status(403).json({ message: "Account deactivated. Contact support." });
    return;
  }

  req.user = user;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== "admin") {
    res.status(403).json({ message: "Admin access required" });
    return;
  }
  next();
}
