import type { Bot, BotSummary, Database } from "@disbot/database";
import { CreateBotRequest, SetBotTokenRequest } from "@disbot/shared/api";
import { BotConfig } from "@disbot/shared/dsl";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import type { CookieOptions } from "./auth/cookies";
import type { Passwords } from "./auth/passwords";
import { type AuthVariables, requireAuth } from "./auth/require-auth";
import { createAuthRouter } from "./auth/router";
import type { SessionStore } from "./auth/session-store";
import { createBots } from "./bot";
import { conflict, invalidRequest, notFound } from "./errors";
import { validateJson } from "./validate";

const UuidParam = z.uuid();

export type AppDeps = {
  db: Database;
  passwords: Passwords;
  sessions: SessionStore;
  cookieOptions: CookieOptions;
  corsOrigin: string;
  tokenMasterKey: Buffer;
};

function toPublicBot(bot: Bot | BotSummary) {
  const hasToken = "hasToken" in bot ? bot.hasToken : bot.discordToken !== null;
  return {
    id: bot.id,
    name: bot.name,
    status: bot.status,
    hasToken,
    config: "config" in bot ? bot.config : undefined,
    createdAt: bot.createdAt.toISOString(),
    updatedAt: bot.updatedAt.toISOString(),
  };
}

export function createApp(deps: AppDeps) {
  const app = new Hono<{ Variables: AuthVariables }>();
  const bots = createBots({ db: deps.db, tokenMasterKey: deps.tokenMasterKey });

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

  app.use("/bots/*", requireAuth(deps.sessions, deps.cookieOptions));

  app.post("/bots", async (c) => {
    const result = await validateJson(c, CreateBotRequest);
    if (!result.ok) return result.response;
    const userId = c.get("userId");
    const bot = await bots.create(userId, {
      name: result.data.name,
      config: result.data.config,
    });
    return c.json(toPublicBot(bot), 201);
  });

  app.get("/bots", async (c) => {
    const userId = c.get("userId");
    const all = await bots.list(userId);
    return c.json(all.map(toPublicBot));
  });

  app.get("/bots/:id", async (c) => {
    const parsedId = UuidParam.safeParse(c.req.param("id"));
    if (!parsedId.success) return invalidRequest(c);
    const userId = c.get("userId");
    const bot = await bots.get(userId, parsedId.data);
    if (!bot) return notFound(c);
    return c.json(toPublicBot(bot));
  });

  app.put("/bots/:id/config", async (c) => {
    const parsedId = UuidParam.safeParse(c.req.param("id"));
    if (!parsedId.success) return invalidRequest(c);
    const body = await validateJson(c, BotConfig);
    if (!body.ok) return body.response;
    const userId = c.get("userId");
    const bot = await bots.updateConfig(userId, parsedId.data, body.data);
    if (!bot) return notFound(c);
    return c.json(toPublicBot(bot));
  });

  app.put("/bots/:id/token", async (c) => {
    const parsedId = UuidParam.safeParse(c.req.param("id"));
    if (!parsedId.success) return invalidRequest(c);
    const body = await validateJson(c, SetBotTokenRequest);
    if (!body.ok) return body.response;
    const userId = c.get("userId");
    const bot = await bots.setToken(
      userId,
      parsedId.data,
      body.data.discordToken,
    );
    if (!bot) return notFound(c);
    return c.json(toPublicBot(bot));
  });

  app.post("/bots/:id/enable", async (c) => {
    const parsedId = UuidParam.safeParse(c.req.param("id"));
    if (!parsedId.success) return invalidRequest(c);
    const userId = c.get("userId");
    const result = await bots.enable(userId, parsedId.data);
    if (result.kind === "not_found") return notFound(c);
    if (result.kind === "conflict") return conflict(c, result.reason);
    return c.json(toPublicBot(result.bot));
  });

  app.post("/bots/:id/disable", async (c) => {
    const parsedId = UuidParam.safeParse(c.req.param("id"));
    if (!parsedId.success) return invalidRequest(c);
    const userId = c.get("userId");
    const result = await bots.disable(userId, parsedId.data);
    if (result.kind === "not_found") return notFound(c);
    if (result.kind === "conflict") return conflict(c, result.reason);
    return c.json(toPublicBot(result.bot));
  });

  return app;
}
