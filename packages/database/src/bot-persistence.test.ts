import { describe, expect, it } from "vitest";
import {
  createBot,
  disableBot,
  enableBot,
  getBotByIdAndOwner,
  listBots,
  updateBotConfig,
  updateBotToken,
} from "./bot-persistence";
import { freshDb, unwrap } from "./test-utils";
import { createUser } from "./user-persistence";

async function createTestUser(db: Awaited<ReturnType<typeof freshDb>>) {
  return unwrap(
    await createUser(db, {
      email: "alice@example.com",
      username: "alice",
      passwordHash: "hash",
    }),
  );
}

describe("createBot", () => {
  it("inserts a bot and returns it with id, name, and createdAt", async () => {
    const db = await freshDb();
    const user = await createTestUser(db);

    const bot = unwrap(await createBot(db, user.id, { name: "Welcome Bot" }));

    expect(bot.name).toBe("Welcome Bot");
    expect(bot.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(bot.createdAt).toBeInstanceOf(Date);
  });

  it("defaults config to an empty BotConfig when none is provided", async () => {
    const db = await freshDb();
    const user = await createTestUser(db);

    const bot = unwrap(await createBot(db, user.id, { name: "Welcome Bot" }));

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

    const bot = unwrap(
      await createBot(db, user.id, { name: "Welcome Bot", config }),
    );

    expect(bot.config).toEqual(config);
  });
});

describe("getBotByIdAndOwner", () => {
  it("returns null when no bot has the given id", async () => {
    const db = await freshDb();
    const user = await createTestUser(db);

    const result = unwrap(
      await getBotByIdAndOwner(
        db,
        "11111111-1111-1111-1111-111111111111",
        user.id,
      ),
    );

    expect(result).toBeNull();
  });

  it("returns the full bot including config when one exists and belongs to the user", async () => {
    const db = await freshDb();
    const user = await createTestUser(db);
    const created = unwrap(
      await createBot(db, user.id, { name: "Welcome Bot" }),
    );

    const result = unwrap(await getBotByIdAndOwner(db, created.id, user.id));

    expect(result).not.toBeNull();
    expect(result?.id).toBe(created.id);
    expect(result?.name).toBe("Welcome Bot");
    expect(result?.config).toEqual({ triggers: [] });
    expect(result?.updatedAt).toBeInstanceOf(Date);
  });

  it("returns null when the bot exists but belongs to a different user", async () => {
    const db = await freshDb();
    const alice = await createTestUser(db);
    const bob = unwrap(
      await createUser(db, {
        email: "bob@example.com",
        username: "bob",
        passwordHash: "hash",
      }),
    );
    const created = unwrap(
      await createBot(db, alice.id, { name: "Alice's Bot" }),
    );

    const result = unwrap(await getBotByIdAndOwner(db, created.id, bob.id));

    expect(result).toBeNull();
  });
});

describe("updateBotConfig", () => {
  it("returns null when no bot has the given id", async () => {
    const db = await freshDb();
    const user = await createTestUser(db);

    const result = unwrap(
      await updateBotConfig(
        db,
        user.id,
        "11111111-1111-1111-1111-111111111111",
        { triggers: [] },
      ),
    );

    expect(result).toBeNull();
  });

  it("returns null when the bot exists but belongs to a different user", async () => {
    const db = await freshDb();
    const alice = await createTestUser(db);
    const bob = unwrap(
      await createUser(db, {
        email: "bob@example.com",
        username: "bob",
        passwordHash: "hash",
      }),
    );
    const created = unwrap(
      await createBot(db, alice.id, { name: "Alice's Bot" }),
    );

    const result = unwrap(
      await updateBotConfig(db, bob.id, created.id, {
        triggers: [],
      }),
    );

    expect(result).toBeNull();
  });

  it("replaces the config, bumps updated_at, and returns the updated bot", async () => {
    const db = await freshDb();
    const user = await createTestUser(db);
    const created = unwrap(
      await createBot(db, user.id, { name: "Welcome Bot" }),
    );
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

    const result = unwrap(
      await updateBotConfig(db, user.id, created.id, newConfig),
    );

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

    const result = unwrap(await listBots(db, user.id));

    expect(result).toEqual([]);
  });

  it("returns previously created bots, newest first", async () => {
    const db = await freshDb();
    const user = await createTestUser(db);
    const first = unwrap(await createBot(db, user.id, { name: "First" }));
    await new Promise((r) => setTimeout(r, 5));
    const second = unwrap(await createBot(db, user.id, { name: "Second" }));

    const result = unwrap(await listBots(db, user.id));

    expect(result.map((b) => b.id)).toEqual([second.id, first.id]);
  });

  it("omits the config column from each item", async () => {
    const db = await freshDb();
    const user = await createTestUser(db);
    unwrap(await createBot(db, user.id, { name: "Welcome Bot" }));

    const result = unwrap(await listBots(db, user.id));

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
    const bob = unwrap(
      await createUser(db, {
        email: "bob@example.com",
        username: "bob",
        passwordHash: "hash",
      }),
    );
    unwrap(await createBot(db, alice.id, { name: "Alice's Bot" }));
    unwrap(await createBot(db, bob.id, { name: "Bob's Bot" }));

    const result = unwrap(await listBots(db, alice.id));

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("Alice's Bot");
  });
});

describe("enableBot", () => {
  it("returns true when the bot is enabled", async () => {
    const db = await freshDb();
    const user = await createTestUser(db);
    const bot = unwrap(await createBot(db, user.id, { name: "Welcome Bot" }));
    unwrap(await updateBotToken(db, user.id, bot.id, "secret-token"));

    const result = unwrap(await enableBot(db, user.id, bot.id));

    expect(result).toBe(true);
  });

  it("returns false when the bot has no token", async () => {
    const db = await freshDb();
    const user = await createTestUser(db);
    const bot = unwrap(await createBot(db, user.id, { name: "Welcome Bot" }));

    const result = unwrap(await enableBot(db, user.id, bot.id));

    expect(result).toBe(false);
  });
});

describe("disableBot", () => {
  it("returns true when the bot is disabled", async () => {
    const db = await freshDb();
    const user = await createTestUser(db);
    const bot = unwrap(await createBot(db, user.id, { name: "Welcome Bot" }));
    unwrap(await updateBotToken(db, user.id, bot.id, "secret-token"));
    unwrap(await enableBot(db, user.id, bot.id));

    const result = unwrap(await disableBot(db, user.id, bot.id));

    expect(result).toBe(true);
  });

  it("returns false when the bot is draft", async () => {
    const db = await freshDb();
    const user = await createTestUser(db);
    const bot = unwrap(await createBot(db, user.id, { name: "Welcome Bot" }));

    const result = unwrap(await disableBot(db, user.id, bot.id));

    expect(result).toBe(false);
  });
});
