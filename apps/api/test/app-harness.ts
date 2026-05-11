import { type FreshDb, freshDb } from "@disbot/database/testing";
import { createApp } from "../src/app";
import type { CookieOptions } from "../src/auth/cookies";
import { bunPasswords } from "../src/auth/passwords";
import {
  createInMemorySessionStore,
  SESSION_TTL_MS,
  type SessionStore,
} from "../src/auth/session-store";

export type AppHarness = {
  app: ReturnType<typeof createApp>;
  db: FreshDb;
  sessions: SessionStore;
};

export async function makeApp(overrides?: {
  cookieOptions?: CookieOptions;
  corsOrigin?: string;
}): Promise<AppHarness> {
  const db = await freshDb();
  const sessions = createInMemorySessionStore({ ttlMs: SESSION_TTL_MS });
  const app = createApp({
    db,
    passwords: bunPasswords,
    sessions,
    cookieOptions: overrides?.cookieOptions ?? {
      sameSite: "Lax",
      secure: false,
    },
    corsOrigin: overrides?.corsOrigin ?? "http://localhost:3001",
  });
  return { app, db, sessions };
}

export function extractSessionCookieValue(res: Response): string {
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) throw new Error("expected Set-Cookie header");
  const match = setCookie.match(/disbot_session=([^;]+)/);
  if (!match?.[1]) throw new Error("expected disbot_session cookie");
  return `disbot_session=${match[1]}`;
}
