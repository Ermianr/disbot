import { describe, expect, it } from "vitest";
import { createRedisSessionStore } from "./redis-session-store";

type Call = { method: string; args: unknown[] };

function fakeRedis(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial));
  const calls: Call[] = [];
  return {
    calls,
    client: {
      async set(key: string, value: string, ...args: string[]) {
        calls.push({ method: "set", args: [key, value, ...args] });
        store.set(key, value);
      },
      async get(key: string) {
        calls.push({ method: "get", args: [key] });
        return store.get(key) ?? null;
      },
      async expire(key: string, seconds: number) {
        calls.push({ method: "expire", args: [key, seconds] });
      },
      async del(key: string) {
        calls.push({ method: "del", args: [key] });
        store.delete(key);
      },
    },
  };
}

describe("createRedisSessionStore.create", () => {
  it("SETs the session JSON at session:<token> with EX equal to ttl in seconds", async () => {
    const redis = fakeRedis();
    const store = createRedisSessionStore(
      redis.client,
      7 * 24 * 60 * 60 * 1000,
    );

    const { token, session } = await store.create("user-1");

    const setCall = redis.calls.find((c) => c.method === "set");
    expect(setCall?.args[0]).toBe(`session:${token}`);
    const stored = JSON.parse(setCall?.args[1] as string);
    expect(stored.userId).toBe("user-1");
    expect(typeof stored.createdAt).toBe("string");
    expect(setCall?.args[2]).toBe("EX");
    expect(setCall?.args[3]).toBe(String(7 * 24 * 60 * 60));
    expect(session.userId).toBe("user-1");
  });
});

describe("createRedisSessionStore.get", () => {
  it("returns null when the key is missing", async () => {
    const redis = fakeRedis();
    const store = createRedisSessionStore(redis.client, 1000);

    expect(await store.get("missing")).toBeNull();
  });

  it("parses the JSON into a Session", async () => {
    const redis = fakeRedis({
      "session:abc": JSON.stringify({
        userId: "user-1",
        createdAt: "2026-05-10T12:00:00.000Z",
      }),
    });
    const store = createRedisSessionStore(redis.client, 1000);

    const session = await store.get("abc");

    expect(session?.userId).toBe("user-1");
    expect(session?.createdAt).toEqual(new Date("2026-05-10T12:00:00.000Z"));
  });
});

describe("createRedisSessionStore.touch", () => {
  it("calls EXPIRE with the ttl on the session key", async () => {
    const redis = fakeRedis();
    const store = createRedisSessionStore(redis.client, 7000);

    await store.touch("abc");

    expect(redis.calls).toContainEqual({
      method: "expire",
      args: ["session:abc", 7],
    });
  });
});

describe("createRedisSessionStore.delete", () => {
  it("calls DEL on the session key", async () => {
    const redis = fakeRedis();
    const store = createRedisSessionStore(redis.client, 1000);

    await store.delete("abc");

    expect(redis.calls).toContainEqual({
      method: "del",
      args: ["session:abc"],
    });
  });
});
