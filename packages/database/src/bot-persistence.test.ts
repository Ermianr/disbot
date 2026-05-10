import { describe, expect, it } from "vitest";
import {
  createBot,
  getBotById,
  listBots,
  updateBotConfig,
} from "./bot-persistence";
import { freshDb } from "./test-utils/fresh-db";

describe("createBot", () => {
  it("inserts a bot and returns it with id, name, and createdAt", async () => {
    const db = await freshDb();

    const bot = await createBot(db, { name: "Welcome Bot" });

    expect(bot.name).toBe("Welcome Bot");
    expect(bot.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(bot.createdAt).toBeInstanceOf(Date);
  });

  it("defaults config to an empty BotConfig when none is provided", async () => {
    const db = await freshDb();

    const bot = await createBot(db, { name: "Welcome Bot" });

    expect(bot.config).toEqual({ triggers: [] });
    expect(bot.updatedAt).toBeInstanceOf(Date);
  });

  it("persists the provided config when one is supplied", async () => {
    const db = await freshDb();
    const config = {
      triggers: [
        {
          event: "message_create" as const,
          actions: [
            {
              type: "send_message" as const,
              content: "hi",
              on_error: "stop" as const,
            },
          ],
        },
      ],
    };

    const bot = await createBot(db, { name: "Welcome Bot", config });

    expect(bot.config).toEqual(config);
  });
});

describe("getBotById", () => {
  it("returns null when no bot has the given id", async () => {
    const db = await freshDb();

    const result = await getBotById(db, "11111111-1111-1111-1111-111111111111");

    expect(result).toBeNull();
  });

  it("returns the full bot including config when one exists", async () => {
    const db = await freshDb();
    const created = await createBot(db, { name: "Welcome Bot" });

    const result = await getBotById(db, created.id);

    expect(result).not.toBeNull();
    expect(result?.id).toBe(created.id);
    expect(result?.name).toBe("Welcome Bot");
    expect(result?.config).toEqual({ triggers: [] });
    expect(result?.updatedAt).toBeInstanceOf(Date);
  });
});

describe("updateBotConfig", () => {
  it("returns null when no bot has the given id", async () => {
    const db = await freshDb();

    const result = await updateBotConfig(
      db,
      "11111111-1111-1111-1111-111111111111",
      { triggers: [] },
    );

    expect(result).toBeNull();
  });

  it("replaces the config, bumps updated_at, and returns the updated bot", async () => {
    const db = await freshDb();
    const created = await createBot(db, { name: "Welcome Bot" });
    await new Promise((r) => setTimeout(r, 10));
    const newConfig = {
      triggers: [
        {
          event: "message_create" as const,
          actions: [
            {
              type: "send_message" as const,
              content: "updated",
              on_error: "stop" as const,
            },
          ],
        },
      ],
    };

    const result = await updateBotConfig(db, created.id, newConfig);

    expect(result).not.toBeNull();
    expect(result?.id).toBe(created.id);
    expect(result?.config).toEqual(newConfig);
    expect(result?.updatedAt.getTime()).toBeGreaterThan(
      created.updatedAt.getTime(),
    );
  });
});

describe("listBots", () => {
  it("returns an empty array when no bots exist", async () => {
    const db = await freshDb();

    const result = await listBots(db);

    expect(result).toEqual([]);
  });

  it("returns previously created bots, newest first", async () => {
    const db = await freshDb();
    const first = await createBot(db, { name: "First" });
    await new Promise((r) => setTimeout(r, 5));
    const second = await createBot(db, { name: "Second" });

    const result = await listBots(db);

    expect(result.map((b) => b.id)).toEqual([second.id, first.id]);
  });

  it("omits the config column from each item", async () => {
    const db = await freshDb();
    await createBot(db, { name: "Welcome Bot" });

    const result = await listBots(db);

    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty("config");
    expect(result[0]).toMatchObject({
      name: "Welcome Bot",
    });
    expect(result[0]?.updatedAt).toBeInstanceOf(Date);
  });
});
