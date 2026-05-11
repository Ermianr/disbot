import type { Database } from "@disbot/database";
import { CreateBotRequest } from "@disbot/shared/api";
import { BotConfig } from "@disbot/shared/dsl";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import type { CookieOptions } from "./auth/cookies";
import type { Passwords } from "./auth/passwords";
import { requireAuth } from "./auth/require-auth";
import { createAuthRouter } from "./auth/router";
import type { SessionStore } from "./auth/session-store";
import { createBots } from "./bot";
import { invalidRequest, notFound } from "./errors";
import { validateJson } from "./validate";

const UuidParam = z.uuid();

export type AppDeps = {
  db: Database;
  passwords: Passwords;
  sessions: SessionStore;
  cookieOptions: CookieOptions;
  corsOrigin: string;
};

export function createApp(deps: AppDeps) {
  const app = new Hono();
  const bots = createBots({ db: deps.db });

  app.use(
    cors({
      origin: deps.corsOrigin,
      credentials: true,
    }),
  );

  app.get("/health", (c) => {
    return c.json({ status: "ok" });
  });

  app.route("/auth", createAuthRouter(deps));

  app.post(
    "/bots",
    requireAuth(deps.sessions, deps.cookieOptions),
    async (c) => {
      const result = await validateJson(c, CreateBotRequest);
      if (!result.ok) return result.response;
      const userId = c.get("userId" as never) as string;
      const bot = await bots.create(userId, {
        name: result.data.name,
        config: result.data.config,
      });
      return c.json(bot, 201);
    },
  );

  app.get(
    "/bots",
    requireAuth(deps.sessions, deps.cookieOptions),
    async (c) => {
      const userId = c.get("userId" as never) as string;
      const all = await bots.list(userId);
      return c.json(all);
    },
  );

  app.get(
    "/bots/:id",
    requireAuth(deps.sessions, deps.cookieOptions),
    async (c) => {
      const parsedId = UuidParam.safeParse(c.req.param("id"));
      if (!parsedId.success) return invalidRequest(c);
      const userId = c.get("userId" as never) as string;
      const bot = await bots.get(userId, parsedId.data);
      if (!bot) return notFound(c);
      return c.json(bot);
    },
  );

  app.put(
    "/bots/:id/config",
    requireAuth(deps.sessions, deps.cookieOptions),
    async (c) => {
      const parsedId = UuidParam.safeParse(c.req.param("id"));
      if (!parsedId.success) return invalidRequest(c);
      const body = await validateJson(c, BotConfig);
      if (!body.ok) return body.response;
      const userId = c.get("userId" as never) as string;
      const bot = await bots.updateConfig(userId, parsedId.data, body.data);
      if (!bot) return notFound(c);
      return c.json(bot);
    },
  );

  return app;
}
