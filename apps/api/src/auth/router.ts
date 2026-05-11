import {
  createUser,
  type Database,
  findUserByEmail,
  findUserById,
  UserConflictError,
} from "@disbot/database";
import { LoginRequest, RegisterRequest } from "@disbot/shared/api";
import type { Context } from "hono";
import { Hono } from "hono";
import { validateJson } from "../validate";
import {
  buildClearSessionCookie,
  buildSetSessionCookie,
  type CookieOptions,
  parseSessionToken,
} from "./cookies";
import type { Passwords } from "./passwords";
import { toPublicUser } from "./public-user";
import type { SessionStore } from "./session-store";

export type AuthDeps = {
  db: Database;
  passwords: Passwords;
  sessions: SessionStore;
  cookieOptions: CookieOptions;
};

export function createAuthRouter(deps: AuthDeps): Hono {
  const router = new Hono();
  const { db, passwords, sessions, cookieOptions } = deps;

  router.post("/register", async (c) => {
    const parsed = await validateJson(c, RegisterRequest);
    if (!parsed.ok) return parsed.response;

    const passwordHash = await passwords.hash(parsed.data.password);
    let user: Awaited<ReturnType<typeof createUser>>;
    try {
      user = await createUser(db, {
        email: parsed.data.email,
        username: parsed.data.username,
        passwordHash,
      });
    } catch (err) {
      if (err instanceof UserConflictError) {
        return c.json({ error: "conflict", field: err.field }, 409);
      }
      throw err;
    }

    const { token } = await sessions.create(user.id);
    c.header("set-cookie", buildSetSessionCookie(token, cookieOptions));
    return c.json({ user: toPublicUser(user) }, 201);
  });

  router.post("/login", async (c) => {
    const parsed = await validateJson(c, LoginRequest);
    if (!parsed.ok) return parsed.response;

    const user = await findUserByEmail(db, parsed.data.email);
    if (!user) return invalidCredentials(c);

    const ok = await passwords.verify(parsed.data.password, user.passwordHash);
    if (!ok) return invalidCredentials(c);

    const { token } = await sessions.create(user.id);
    c.header("set-cookie", buildSetSessionCookie(token, cookieOptions));
    return c.json({ user: toPublicUser(user) }, 200);
  });

  router.post("/logout", async (c) => {
    const token = parseSessionToken(c.req.header("cookie") ?? null);
    if (!token) return unauthorized(c);
    const session = await sessions.get(token);
    if (!session) return unauthorized(c);

    await sessions.delete(token);
    c.header("set-cookie", buildClearSessionCookie(cookieOptions));
    return c.body(null, 204);
  });

  router.get("/me", async (c) => {
    const token = parseSessionToken(c.req.header("cookie") ?? null);
    if (!token) return unauthorized(c);
    const session = await sessions.get(token);
    if (!session) return unauthorized(c);

    const user = await findUserById(db, session.userId);
    if (!user) {
      await sessions.delete(token);
      return unauthorized(c);
    }

    await sessions.touch(token);
    c.header("set-cookie", buildSetSessionCookie(token, cookieOptions));
    return c.json({ user: toPublicUser(user) }, 200);
  });

  return router;
}

function unauthorized(c: Context) {
  return c.json({ error: "unauthorized" }, 401);
}

function invalidCredentials(c: Context) {
  return c.json({ error: "invalid_credentials" }, 401);
}
