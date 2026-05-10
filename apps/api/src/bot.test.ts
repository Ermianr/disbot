import { freshDb } from "@disbot/database/testing";
import { describe, expect, it } from "vitest";
import { createBots } from "./bot";

describe("Bots.create", () => {
  it("persists a bot and returns it with id, name, and createdAt", async () => {
    const db = await freshDb();
    const bots = createBots({ db });

    const bot = await bots.create({ name: "Welcome Bot" });

    expect(bot.name).toBe("Welcome Bot");
    expect(bot.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(bot.createdAt).toBeInstanceOf(Date);
  });
});

describe("Bots.list", () => {
  it("returns an empty array when no bots exist", async () => {
    const db = await freshDb();
    const bots = createBots({ db });

    const result = await bots.list();

    expect(result).toEqual([]);
  });

  it("returns previously created bots, newest first", async () => {
    const db = await freshDb();
    const bots = createBots({ db });
    const first = await bots.create({ name: "First" });
    await new Promise((r) => setTimeout(r, 5));
    const second = await bots.create({ name: "Second" });

    const result = await bots.list();

    expect(result.map((b) => b.id)).toEqual([second.id, first.id]);
  });
});
