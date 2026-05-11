import { describe, expect, it } from "vitest";
import {
  createBot,
  getBotByIdAndOwner,
  listBots,
  updateBotConfig,
} from "./bot-persistence";
import { freshDb } from "./test-utils/fresh-db";
import { createUser } from "./user-persistence";

async function createTestUser(db: Awaited<ReturnType<typeof freshDb>>) {
  return createUser(db, {
    email: "alice@example.com",
    username: "alice",
    passwordHash: "hash",
  });
}

describe("createBot", () => {
  it("inserts a bot and returns it with id, name, and createdAt", async () => {
    const db = await freshDb();
    const user = await createTestUser(db);

    const bot = await createBot(db, user.id, { name: "Welcome Bot" });

    expect(bot.name).toBe("Welcome Bot");
    expect(bot.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(bot.createdAt).toBeInstanceOf(Date);
  });

  it("defaults config to an empty BotConfig when none is provided", async () => {
    const db = await freshDb();
    const user = await createTestUser(db);

    const bot = await createBot(db, user.id, { name: "Welcome Bot" });

    expect(bot.config).toEqual({ triggers: [] });
    expect(bot.updatedAt).toBeInstanceOf(Date);
  });

  it("persists the provided config when one is supplied", async () => {
    const db = await freshDb();
    const user = await createTestUser(db);
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

    const bot = await createBot(db, user.id, { name: "Welcome Bot", config });

    expect(bot.config).toEqual(config);
  });
});

describe("getBotByIdAndOwner", () => {
  it("returns null when no bot has the given id", async () => {
    const db = await freshDb();
    const user = await createTestUser(db);

    const result = await getBotByIdAndOwner(
      db,
      "11111111-1111-1111-1111-111111111111",
      user.id,
    );

    expect(result).toBeNull();
  });

  it("returns the full bot including config when one exists and belongs to the user", async () => {
    const db = await freshDb();
    const user = await createTestUser(db);
    const created = await createBot(db, user.id, { name: "Welcome Bot" });

    const result = await getBotByIdAndOwner(db, created.id, user.id);

    expect(result).not.toBeNull();
    expect(result?.id).toBe(created.id);
    expect(result?.name).toBe("Welcome Bot");
    expect(result?.config).toEqual({ triggers: [] });
    expect(result?.updatedAt).toBeInstanceOf(Date);
  });

  it("returns null when the bot exists but belongs to a different user", async () => {
    const db = await freshDb();
    const alice = await createTestUser(db);
    const bob = await createUser(db, {
      email: "bob@example.com",
      username: "bob",
      passwordHash: "hash",
    });
    const created = await createBot(db, alice.id, { name: "Alice's Bot" });

    const result = await getBotByIdAndOwner(db, created.id, bob.id);

    expect(result).toBeNull();
  });
});

describe("updateBotConfig", () => {
  it("returns null when no bot has the given id", async () => {
    const db = await freshDb();
    const user = await createTestUser(db);

    const result = await updateBotConfig(
      db,
      user.id,
      "11111111-1111-1111-1111-111111111111",
      { triggers: [] },
    );

    expect(result).toBeNull();
  });

  it("returns null when the bot exists but belongs to a different user", async () => {
    const db = await freshDb();
    const alice = await createTestUser(db);
    const bob = await createUser(db, {
      email: "bob@example.com",
      username: "bob",
      passwordHash: "hash",
    });
    const created = await createBot(db, alice.id, { name: "Alice's Bot" });

    const result = await updateBotConfig(db, bob.id, created.id, {
      triggers: [],
    });

    expect(result).toBeNull();
  });

  it("replaces the config, bumps updated_at, and returns the updated bot", async () => {
    const db = await freshDb();
    const user = await createTestUser(db);
    const created = await createBot(db, user.id, { name: "Welcome Bot" });
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

    const result = await updateBotConfig(db, user.id, created.id, newConfig);

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
    const user = await createTestUser(db);

    const result = await listBots(db, user.id);

    expect(result).toEqual([]);
  });

  it("returns previously created bots, newest first", async () => {
    const db = await freshDb();
    const user = await createTestUser(db);
    const first = await createBot(db, user.id, { name: "First" });
    await new Promise((r) => setTimeout(r, 5));
    const second = await createBot(db, user.id, { name: "Second" });

    const result = await listBots(db, user.id);

    expect(result.map((b) => b.id)).toEqual([second.id, first.id]);
  });

  it("omits the config column from each item", async () => {
    const db = await freshDb();
    const user = await createTestUser(db);
    await createBot(db, user.id, { name: "Welcome Bot" });

    const result = await listBots(db, user.id);

    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty("config");
    expect(result[0]).toMatchObject({
      name: "Welcome Bot",
    });
    expect(result[0]?.updatedAt).toBeInstanceOf(Date);
  });

  it("returns only bots belonging to the given user", async () => {
    const db = await freshDb();
    const alice = await createTestUser(db);
    const bob = await createUser(db, {
      email: "bob@example.com",
      username: "bob",
      passwordHash: "hash",
    });
    await createBot(db, alice.id, { name: "Alice's Bot" });
    await createBot(db, bob.id, { name: "Bob's Bot" });

    const result = await listBots(db, alice.id);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("Alice's Bot");
  });
});
