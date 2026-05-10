import { freshDb } from "@disbot/database/testing";
import { describe, expect, it } from "vitest";
import { createApp } from "./app";

describe("GET /health", () => {
  it("returns ok status", async () => {
    const db = await freshDb();
    const app = createApp({ db });

    const res = await app.request("/health");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok" });
  });
});

describe("POST /bots", () => {
  it("creates a bot and returns 201 with the persisted record", async () => {
    const db = await freshDb();
    const app = createApp({ db });

    const res = await app.request("/bots", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Welcome Bot" }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      id: string;
      name: string;
      createdAt: string;
    };
    expect(body.name).toBe("Welcome Bot");
    expect(body.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(typeof body.createdAt).toBe("string");
  });

  it("returns 400 when the body is missing name", async () => {
    const db = await freshDb();
    const app = createApp({ db });

    const res = await app.request("/bots", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 when name is an empty string", async () => {
    const db = await freshDb();
    const app = createApp({ db });

    const res = await app.request("/bots", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });

    expect(res.status).toBe(400);
  });

  it("returns the canonical 400 shape when the body is not valid JSON", async () => {
    const db = await freshDb();
    const app = createApp({ db });

    const res = await app.request("/bots", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json",
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_request" });
  });
});

describe("GET /bots", () => {
  it("returns an empty array when no bots exist", async () => {
    const db = await freshDb();
    const app = createApp({ db });

    const res = await app.request("/bots");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns previously created bots", async () => {
    const db = await freshDb();
    const app = createApp({ db });
    await app.request("/bots", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Alpha" }),
    });
    await app.request("/bots", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Beta" }),
    });

    const res = await app.request("/bots");

    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ name: string }>;
    expect(body.map((b) => b.name).sort()).toEqual(["Alpha", "Beta"]);
  });
});
