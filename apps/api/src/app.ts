import { createBot, type Database, listBots } from "@disbot/database";
import { CreateBotRequest } from "@disbot/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";

export type AppDeps = {
  db: Database;
};

export function createApp({ db }: AppDeps) {
  const app = new Hono();

  app.use(cors());

  app.get("/health", (c) => {
    return c.json({ status: "ok" });
  });

  app.post("/bots", async (c) => {
    const raw = await c.req.json().catch(() => null);
    const parsed = CreateBotRequest.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: "invalid_request" }, 400);
    }
    const bot = await createBot(db, { name: parsed.data.name });
    return c.json(bot, 201);
  });

  app.get("/bots", async (c) => {
    const all = await listBots(db);
    return c.json(all);
  });

  return app;
}
