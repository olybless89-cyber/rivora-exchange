import { usersTable } from "@workspace/db";

export function toPublicUser(u: typeof usersTable.$inferSelect) {
  const { passwordHash: _, ...pub } = u;
  return pub;
}
