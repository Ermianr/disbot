import { createUser } from "@disbot/database";
import { freshDb } from "@disbot/database/testing";
import { describe, expect, it } from "vitest";
import { createBots } from "./bot";

const TEST_KEY = Buffer.from("a".repeat(32));

async function createTestUser(db: Awaited<ReturnType<typeof freshDb>>) {
  return createUser(db, {
    email: "alice@example.com",
    username: "alice",
    passwordHash: "hash",
  });
}

describe("Bots.create", () => {
  it("persists a bot and returns it with id, name, and createdAt", async () => {
    const db = await freshDb();
    const bots = createBots({ db, tokenMasterKey: TEST_KEY });
    const user = await createTestUser(db);

    const bot = await bots.create(user.id, { name: "Welcome Bot" });

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
    const bots = createBots({ db, tokenMasterKey: TEST_KEY });
    const user = await createTestUser(db);

    const result = await bots.list(user.id);

    expect(result).toEqual([]);
  });

  it("returns previously created bots, newest first", async () => {
    const db = await freshDb();
    const bots = createBots({ db, tokenMasterKey: TEST_KEY });
    const user = await createTestUser(db);
    const first = await bots.create(user.id, { name: "First" });
    await new Promise((r) => setTimeout(r, 5));
    const second = await bots.create(user.id, { name: "Second" });

    const result = await bots.list(user.id);

    expect(result.map((b) => b.id)).toEqual([second.id, first.id]);
  });
});

describe("Bots.setToken", () => {
  it("encrypts and stores the discord token", async () => {
    const db = await freshDb();
    const bots = createBots({ db, tokenMasterKey: TEST_KEY });
    const user = await createTestUser(db);
    const bot = await bots.create(user.id, { name: "Welcome Bot" });

    const updated = await bots.setToken(user.id, bot.id, "secret-token");

    expect(updated).not.toBeNull();
    expect(updated?.discordToken).not.toBe("secret-token");
    expect(updated?.discordToken).toBeTruthy();
  });
});

describe("Bots.enable", () => {
  it("returns conflict when the bot has no token", async () => {
    const db = await freshDb();
    const bots = createBots({ db, tokenMasterKey: TEST_KEY });
    const user = await createTestUser(db);
    const bot = await bots.create(user.id, { name: "Welcome Bot" });

    const result = await bots.enable(user.id, bot.id);

    expect(result.kind).toBe("conflict");
    if (result.kind === "conflict") {
      expect(result.reason).toBe("bot_has_no_token");
    }
  });

  it("enables a bot with a token", async () => {
    const db = await freshDb();
    const bots = createBots({ db, tokenMasterKey: TEST_KEY });
    const user = await createTestUser(db);
    const bot = await bots.create(user.id, { name: "Welcome Bot" });
    await bots.setToken(user.id, bot.id, "secret-token");

    const result = await bots.enable(user.id, bot.id);

    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.bot.status).toBe("enabled");
    }
  });
});

describe("Bots.disable", () => {
  it("returns conflict when the bot is draft", async () => {
    const db = await freshDb();
    const bots = createBots({ db, tokenMasterKey: TEST_KEY });
    const user = await createTestUser(db);
    const bot = await bots.create(user.id, { name: "Welcome Bot" });

    const result = await bots.disable(user.id, bot.id);

    expect(result.kind).toBe("conflict");
    if (result.kind === "conflict") {
      expect(result.reason).toBe("invalid_status_transition");
    }
  });

  it("disables an enabled bot", async () => {
    const db = await freshDb();
    const bots = createBots({ db, tokenMasterKey: TEST_KEY });
    const user = await createTestUser(db);
    const bot = await bots.create(user.id, { name: "Welcome Bot" });
    await bots.setToken(user.id, bot.id, "secret-token");
    await bots.enable(user.id, bot.id);

    const result = await bots.disable(user.id, bot.id);

    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.bot.status).toBe("disabled");
    }
  });
});
