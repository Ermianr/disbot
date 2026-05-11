import type { Context, Next } from "hono";
import {
  buildClearSessionCookie,
  type CookieOptions,
  parseSessionToken,
} from "./cookies";
import type { SessionStore } from "./session-store";

export type AuthVariables = {
  userId: string;
};

export function requireAuth(
  sessions: SessionStore,
  cookieOptions: CookieOptions,
) {
  return async (c: Context<{ Variables: AuthVariables }>, next: Next) => {
    const token = parseSessionToken(c.req.header("cookie") ?? null);
    if (!token) {
      c.header("set-cookie", buildClearSessionCookie(cookieOptions));
      return c.json({ error: "unauthorized" }, 401);
    }
    const session = await sessions.get(token);
    if (!session) {
      c.header("set-cookie", buildClearSessionCookie(cookieOptions));
      return c.json({ error: "unauthorized" }, 401);
    }
    c.set("userId", session.userId);
    await next();
  };
}
