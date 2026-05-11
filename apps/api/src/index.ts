import { createDb, runMigrations } from "@disbot/database";
import { createApp } from "./app";
import type { CookieOptions, SameSiteOption } from "./auth/cookies";
import { bunPasswords } from "./auth/passwords";
import { createRedisSessionStore } from "./auth/redis-session-store";
import { SESSION_TTL_MS } from "./auth/session-store";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error("REDIS_URL is required");
}

const corsOrigin = process.env.WEB_ORIGIN;
if (!corsOrigin) {
  throw new Error("WEB_ORIGIN is required");
}

const cookieOptions: CookieOptions = {
  sameSite: parseSameSite(process.env.COOKIE_SAMESITE),
  secure: parseSecure(process.env.COOKIE_SECURE),
};

const db = createDb(connectionString);
await runMigrations(db);

const redis = new Bun.RedisClient(redisUrl);
await redis.connect();

const app = createApp({
  db,
  passwords: bunPasswords,
  sessions: createRedisSessionStore(redis, SESSION_TTL_MS),
  cookieOptions,
  corsOrigin,
});

const port = Number(process.env.PORT) || 3000;

const server = Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`API running at http://localhost:${server.port}`);

function parseSameSite(value: string | undefined): SameSiteOption {
  if (value === "Strict" || value === "Lax" || value === "None") return value;
  return "Lax";
}

function parseSecure(value: string | undefined): boolean {
  return value === "true" || value === "1";
}
