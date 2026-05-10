import type { Database } from "@disbot/database";
import { CreateBotRequest } from "@disbot/shared/api";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createBots } from "./bot";
import { validateJson } from "./validate";

export type AppDeps = {
  db: Database;
};

export function createApp({ db }: AppDeps) {
  const app = new Hono();
  const bots = createBots({ db });

  app.use(cors());

  app.get("/health", (c) => {
    return c.json({ status: "ok" });
  });

  app.post("/bots", async (c) => {
    const result = await validateJson(c, CreateBotRequest);
    if (!result.ok) return result.response;
    const bot = await bots.create({ name: result.data.name });
    return c.json(bot, 201);
  });

  app.get("/bots", async (c) => {
    const all = await bots.list();
    return c.json(all);
  });

  return app;
}
