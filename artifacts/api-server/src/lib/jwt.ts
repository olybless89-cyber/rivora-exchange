import jwt from "jsonwebtoken";

// A plain `const x = process.env.X; if (!x) throw ...` doesn't narrow `x`'s
// type inside functions declared later in the file (TS control-flow
// narrowing doesn't cross into closures), so signToken/verifyToken below
// would still see `string | undefined`. Wrapping the check in an IIFE gives
// JWT_SECRET a solid `string` type everywhere it's used.
const JWT_SECRET: string = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required but was not provided.");
  }
  return secret;
})();

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): { sub: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { sub: string };
  } catch {
    return null;
  }
}
