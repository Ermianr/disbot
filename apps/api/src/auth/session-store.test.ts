import { describe, expect, it } from "vitest";
import { createInMemorySessionStore } from "./session-store";

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

describe("InMemorySessionStore.create", () => {
  it("returns an opaque base64url token (≥ 32 bytes encoded)", async () => {
    const store = createInMemorySessionStore({ ttlMs: TTL_MS });
    const { token } = await store.create("user-1");

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(Buffer.from(token, "base64url").byteLength).toBe(32);
  });

  it("returns a different token for each call", async () => {
    const store = createInMemorySessionStore({ ttlMs: TTL_MS });
    const a = await store.create("user-1");
    const b = await store.create("user-1");

    expect(a.token).not.toBe(b.token);
  });
});

describe("InMemorySessionStore.get", () => {
  it("returns the stored session for a known token", async () => {
    const store = createInMemorySessionStore({ ttlMs: TTL_MS });
    const { token } = await store.create("user-1");

    const session = await store.get(token);

    expect(session?.userId).toBe("user-1");
    expect(session?.createdAt).toBeInstanceOf(Date);
  });

  it("returns null for an unknown token", async () => {
    const store = createInMemorySessionStore({ ttlMs: TTL_MS });

    expect(await store.get("missing")).toBeNull();
  });

  it("returns null once the session is older than ttlMs", async () => {
    let now = 1_000_000;
    const store = createInMemorySessionStore({
      ttlMs: 100,
      now: () => now,
    });
    const { token } = await store.create("user-1");

    now += 101;

    expect(await store.get(token)).toBeNull();
  });
});

describe("InMemorySessionStore.touch", () => {
  it("slides the expiry forward so a stale session becomes fresh again", async () => {
    let now = 1_000_000;
    const store = createInMemorySessionStore({
      ttlMs: 100,
      now: () => now,
    });
    const { token } = await store.create("user-1");

    now += 50;
    await store.touch(token);
    now += 75;

    expect(await store.get(token)).not.toBeNull();
  });
});

describe("InMemorySessionStore.delete", () => {
  it("removes the session so subsequent get returns null", async () => {
    const store = createInMemorySessionStore({ ttlMs: TTL_MS });
    const { token } = await store.create("user-1");

    await store.delete(token);

    expect(await store.get(token)).toBeNull();
  });
});
