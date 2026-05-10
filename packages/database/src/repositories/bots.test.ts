import { describe, expect, it } from "vitest";
import { freshDb } from "../test-utils/fresh-db";
import { createBot, listBots } from "./bots";

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
});
