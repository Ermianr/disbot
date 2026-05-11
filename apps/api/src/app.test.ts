import { describe, expect, it } from "vitest";
import { makeApp, registerUser } from "../test/app-harness";

describe("GET /health", () => {
  it("returns ok status", async () => {
    const { app } = await makeApp();

    const res = await app.request("/health");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok" });
  });
});

describe("POST /bots", () => {
  it("returns 401 when no session cookie is sent", async () => {
    const { app } = await makeApp();

    const res = await app.request("/bots", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Welcome Bot" }),
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("creates a bot and returns 201 with the persisted record", async () => {
    const { app } = await makeApp();
    const { cookie } = await registerUser(app);

    const res = await app.request("/bots", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
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
    const { app } = await makeApp();
    const { cookie } = await registerUser(app);

    const res = await app.request("/bots", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 when name is an empty string", async () => {
    const { app } = await makeApp();
    const { cookie } = await registerUser(app);

    const res = await app.request("/bots", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ name: "" }),
    });

    expect(res.status).toBe(400);
  });

  it("returns the canonical 400 shape when the body is not valid JSON", async () => {
    const { app } = await makeApp();
    const { cookie } = await registerUser(app);

    const res = await app.request("/bots", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: "not json",
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_request" });
  });

  it("persists and returns the provided config when one is supplied", async () => {
    const { app } = await makeApp();
    const { cookie } = await registerUser(app);
    const config = {
      triggers: [
        {
          event: "message_create",
          actions: [{ type: "send_message", content: "hi", on_error: "stop" }],
        },
      ],
    };

    const res = await app.request("/bots", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ name: "Welcome Bot", config }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { config: unknown; updatedAt: string };
    expect(body.config).toEqual(config);
    expect(typeof body.updatedAt).toBe("string");
  });

  it("defaults config to an empty BotConfig when omitted", async () => {
    const { app } = await makeApp();
    const { cookie } = await registerUser(app);

    const res = await app.request("/bots", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ name: "Welcome Bot" }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { config: unknown; updatedAt: string };
    expect(body.config).toEqual({ triggers: [] });
    expect(typeof body.updatedAt).toBe("string");
  });

  it("returns 400 when config is structurally invalid", async () => {
    const { app } = await makeApp();
    const { cookie } = await registerUser(app);

    const res = await app.request("/bots", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({
        name: "Welcome Bot",
        config: { triggers: [{ event: "unknown_event", actions: [] }] },
      }),
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_request" });
  });
});

describe("GET /bots", () => {
  it("returns 401 when no session cookie is sent", async () => {
    const { app } = await makeApp();

    const res = await app.request("/bots");

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("returns an empty array when no bots exist", async () => {
    const { app } = await makeApp();
    const { cookie } = await registerUser(app);

    const res = await app.request("/bots", { headers: { cookie } });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns previously created bots", async () => {
    const { app } = await makeApp();
    const { cookie } = await registerUser(app);
    await app.request("/bots", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ name: "Alpha" }),
    });
    await app.request("/bots", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ name: "Beta" }),
    });

    const res = await app.request("/bots", { headers: { cookie } });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ name: string }>;
    expect(body.map((b) => b.name).sort()).toEqual(["Alpha", "Beta"]);
  });

  it("returns only bots belonging to the caller", async () => {
    const { app } = await makeApp();
    const alice = await registerUser(app);
    const bob = await registerUser(app, {
      email: "bob@example.com",
      username: "bob",
      password: "supersecret",
    });
    await app.request("/bots", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: alice.cookie },
      body: JSON.stringify({ name: "Alice's Bot" }),
    });
    await app.request("/bots", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: bob.cookie },
      body: JSON.stringify({ name: "Bob's Bot" }),
    });

    const res = await app.request("/bots", {
      headers: { cookie: alice.cookie },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ name: string }>;
    expect(body).toHaveLength(1);
    expect(body[0]?.name).toBe("Alice's Bot");
  });
});

describe("GET /bots/:id", () => {
  it("returns 401 when no session cookie is sent", async () => {
    const { app } = await makeApp();

    const res = await app.request("/bots/00000000-0000-4000-8000-000000000000");

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("returns 400 invalid_request when :id is not a UUID", async () => {
    const { app } = await makeApp();
    const { cookie } = await registerUser(app);

    const res = await app.request("/bots/not-a-uuid", { headers: { cookie } });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_request" });
  });

  it("returns 404 not_found when no bot has the given id", async () => {
    const { app } = await makeApp();
    const { cookie } = await registerUser(app);

    const res = await app.request(
      "/bots/00000000-0000-4000-8000-000000000000",
      { headers: { cookie } },
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
  });

  it("returns 200 with the full bot including config and updatedAt", async () => {
    const { app } = await makeApp();
    const { cookie } = await registerUser(app);
    const created = await app.request("/bots", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ name: "Welcome Bot" }),
    });
    const createdBody = (await created.json()) as { id: string };

    const res = await app.request(`/bots/${createdBody.id}`, {
      headers: { cookie },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      id: string;
      name: string;
      config: unknown;
      updatedAt: string;
    };
    expect(body.id).toBe(createdBody.id);
    expect(body.name).toBe("Welcome Bot");
    expect(body.config).toEqual({ triggers: [] });
    expect(typeof body.updatedAt).toBe("string");
  });

  it("returns 404 when the bot exists but belongs to a different user", async () => {
    const { app } = await makeApp();
    const alice = await registerUser(app);
    const bob = await registerUser(app, {
      email: "bob@example.com",
      username: "bob",
      password: "supersecret",
    });
    const created = await app.request("/bots", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: alice.cookie },
      body: JSON.stringify({ name: "Alice's Bot" }),
    });
    const createdBody = (await created.json()) as { id: string };

    const res = await app.request(`/bots/${createdBody.id}`, {
      headers: { cookie: bob.cookie },
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
  });
});

describe("PUT /bots/:id/config", () => {
  const validConfig = {
    triggers: [
      {
        event: "message_create",
        actions: [{ type: "send_message", content: "hi", on_error: "stop" }],
      },
    ],
  };

  it("returns 401 when no session cookie is sent", async () => {
    const { app } = await makeApp();

    const res = await app.request(
      "/bots/00000000-0000-4000-8000-000000000000/config",
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validConfig),
      },
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("returns 400 invalid_request when :id is not a UUID", async () => {
    const { app } = await makeApp();
    const { cookie } = await registerUser(app);

    const res = await app.request("/bots/not-a-uuid/config", {
      method: "PUT",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify(validConfig),
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_request" });
  });

  it("returns 400 invalid_request when the body fails BotConfig validation", async () => {
    const { app } = await makeApp();
    const { cookie } = await registerUser(app);
    const created = await app.request("/bots", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ name: "Welcome Bot" }),
    });
    const createdBody = (await created.json()) as { id: string };

    const res = await app.request(`/bots/${createdBody.id}/config`, {
      method: "PUT",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({
        triggers: [{ event: "unknown_event", actions: [] }],
      }),
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_request" });
  });

  it("returns 404 not_found when the body is valid but no bot exists with that id", async () => {
    const { app } = await makeApp();
    const { cookie } = await registerUser(app);

    const res = await app.request(
      "/bots/00000000-0000-4000-8000-000000000000/config",
      {
        method: "PUT",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify(validConfig),
      },
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
  });

  it("returns 404 when the bot exists but belongs to a different user", async () => {
    const { app } = await makeApp();
    const alice = await registerUser(app);
    const bob = await registerUser(app, {
      email: "bob@example.com",
      username: "bob",
      password: "supersecret",
    });
    const created = await app.request("/bots", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: alice.cookie },
      body: JSON.stringify({ name: "Alice's Bot" }),
    });
    const createdBody = (await created.json()) as { id: string };

    const res = await app.request(`/bots/${createdBody.id}/config`, {
      method: "PUT",
      headers: { "content-type": "application/json", cookie: bob.cookie },
      body: JSON.stringify(validConfig),
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
  });

  it("replaces the config, bumps updated_at, and returns the updated bot", async () => {
    const { app } = await makeApp();
    const { cookie } = await registerUser(app);
    const created = await app.request("/bots", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ name: "Welcome Bot" }),
    });
    const createdBody = (await created.json()) as {
      id: string;
      updatedAt: string;
    };

    await new Promise((r) => setTimeout(r, 10));
    const res = await app.request(`/bots/${createdBody.id}/config`, {
      method: "PUT",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify(validConfig),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      id: string;
      config: unknown;
      updatedAt: string;
    };
    expect(body.id).toBe(createdBody.id);
    expect(body.config).toEqual(validConfig);
    expect(new Date(body.updatedAt).getTime()).toBeGreaterThan(
      new Date(createdBody.updatedAt).getTime(),
    );

    const fetched = await app.request(`/bots/${createdBody.id}`, {
      headers: { cookie },
    });
    const fetchedBody = (await fetched.json()) as { config: unknown };
    expect(fetchedBody.config).toEqual(validConfig);
  });
});

describe("GET /bots â€” extras", () => {
  it("omits config from each item in the summary response", async () => {
    const { app } = await makeApp();
    const { cookie } = await registerUser(app);
    await app.request("/bots", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ name: "Alpha" }),
    });

    const res = await app.request("/bots", { headers: { cookie } });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<Record<string, unknown>>;
    expect(body).toHaveLength(1);
    expect(body[0]).not.toHaveProperty("config");
    expect(body[0]).toMatchObject({ name: "Alpha" });
    expect(body[0]).toHaveProperty("updatedAt");
  });
});

describe("PUT /bots/:id/token", () => {
  it("returns 401 when no session cookie is sent", async () => {
    const { app } = await makeApp();

    const res = await app.request(
      "/bots/00000000-0000-4000-8000-000000000000/token",
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ discordToken: "secret" }),
      },
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("returns 400 invalid_request when :id is not a UUID", async () => {
    const { app } = await makeApp();
    const { cookie } = await registerUser(app);

    const res = await app.request("/bots/not-a-uuid/token", {
      method: "PUT",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ discordToken: "secret" }),
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_request" });
  });

  it("returns 404 not_found when no bot has the given id", async () => {
    const { app } = await makeApp();
    const { cookie } = await registerUser(app);

    const res = await app.request(
      "/bots/00000000-0000-4000-8000-000000000000/token",
      {
        method: "PUT",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ discordToken: "secret" }),
      },
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
  });

  it("stores the encrypted token and returns the bot with hasToken true", async () => {
    const { app } = await makeApp();
    const { cookie } = await registerUser(app);
    const created = await app.request("/bots", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ name: "Welcome Bot" }),
    });
    const createdBody = (await created.json()) as { id: string };

    const res = await app.request(`/bots/${createdBody.id}/token`, {
      method: "PUT",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ discordToken: "my-secret-token" }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.hasToken).toBe(true);
    expect(body).not.toHaveProperty("discordToken");
    expect(body.status).toBe("draft");

    const fetched = await app.request(`/bots/${createdBody.id}`, {
      headers: { cookie },
    });
    const fetchedBody = (await fetched.json()) as Record<string, unknown>;
    expect(fetchedBody.hasToken).toBe(true);
    expect(fetchedBody).not.toHaveProperty("discordToken");
  });
});

describe("GET /bots/:id — PublicBot shape", () => {
  it("returns hasToken false and never leaks discordToken for a bot without a token", async () => {
    const { app } = await makeApp();
    const { cookie } = await registerUser(app);
    const created = await app.request("/bots", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ name: "Welcome Bot" }),
    });
    const createdBody = (await created.json()) as { id: string };

    const res = await app.request(`/bots/${createdBody.id}`, {
      headers: { cookie },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.hasToken).toBe(false);
    expect(body).not.toHaveProperty("discordToken");
    expect(body.status).toBe("draft");
  });
});

describe("GET /bots — PublicBot shape", () => {
  it("returns hasToken in the summary list", async () => {
    const { app } = await makeApp();
    const { cookie } = await registerUser(app);
    await app.request("/bots", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ name: "Alpha" }),
    });

    const res = await app.request("/bots", { headers: { cookie } });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<Record<string, unknown>>;
    expect(body).toHaveLength(1);
    expect(body[0]?.hasToken).toBe(false);
    expect(body[0]).not.toHaveProperty("discordToken");
  });
});

describe("POST /bots/:id/enable", () => {
  it("returns 401 when no session cookie is sent", async () => {
    const { app } = await makeApp();

    const res = await app.request(
      "/bots/00000000-0000-4000-8000-000000000000/enable",
      { method: "POST" },
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("returns 400 invalid_request when :id is not a UUID", async () => {
    const { app } = await makeApp();
    const { cookie } = await registerUser(app);

    const res = await app.request("/bots/not-a-uuid/enable", {
      method: "POST",
      headers: { cookie },
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_request" });
  });

  it("returns 404 not_found when no bot has the given id", async () => {
    const { app } = await makeApp();
    const { cookie } = await registerUser(app);

    const res = await app.request(
      "/bots/00000000-0000-4000-8000-000000000000/enable",
      { method: "POST", headers: { cookie } },
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
  });

  it("returns 409 conflict when the bot has no token", async () => {
    const { app } = await makeApp();
    const { cookie } = await registerUser(app);
    const created = await app.request("/bots", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ name: "Welcome Bot" }),
    });
    const createdBody = (await created.json()) as { id: string };

    const res = await app.request(`/bots/${createdBody.id}/enable`, {
      method: "POST",
      headers: { cookie },
    });

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "conflict",
      reason: "bot_has_no_token",
    });
  });

  it("returns 409 conflict when the bot status is enabled", async () => {
    const { app } = await makeApp();
    const { cookie } = await registerUser(app);
    const created = await app.request("/bots", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ name: "Welcome Bot" }),
    });
    const createdBody = (await created.json()) as { id: string };
    await app.request(`/bots/${createdBody.id}/token`, {
      method: "PUT",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ discordToken: "secret" }),
    });
    await app.request(`/bots/${createdBody.id}/enable`, {
      method: "POST",
      headers: { cookie },
    });

    const res = await app.request(`/bots/${createdBody.id}/enable`, {
      method: "POST",
      headers: { cookie },
    });

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "conflict",
      reason: "invalid_status_transition",
    });
  });

  it("enables a draft bot and returns status enabled", async () => {
    const { app } = await makeApp();
    const { cookie } = await registerUser(app);
    const created = await app.request("/bots", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ name: "Welcome Bot" }),
    });
    const createdBody = (await created.json()) as { id: string };
    await app.request(`/bots/${createdBody.id}/token`, {
      method: "PUT",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ discordToken: "secret" }),
    });

    const res = await app.request(`/bots/${createdBody.id}/enable`, {
      method: "POST",
      headers: { cookie },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.status).toBe("enabled");
  });

  it("enables a previously disabled bot", async () => {
    const { app } = await makeApp();
    const { cookie } = await registerUser(app);
    const created = await app.request("/bots", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ name: "Welcome Bot" }),
    });
    const createdBody = (await created.json()) as { id: string };
    await app.request(`/bots/${createdBody.id}/token`, {
      method: "PUT",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ discordToken: "secret" }),
    });
    await app.request(`/bots/${createdBody.id}/enable`, {
      method: "POST",
      headers: { cookie },
    });
    await app.request(`/bots/${createdBody.id}/disable`, {
      method: "POST",
      headers: { cookie },
    });

    const res = await app.request(`/bots/${createdBody.id}/enable`, {
      method: "POST",
      headers: { cookie },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.status).toBe("enabled");
  });
});

describe("POST /bots/:id/disable", () => {
  it("returns 401 when no session cookie is sent", async () => {
    const { app } = await makeApp();

    const res = await app.request(
      "/bots/00000000-0000-4000-8000-000000000000/disable",
      { method: "POST" },
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("returns 400 invalid_request when :id is not a UUID", async () => {
    const { app } = await makeApp();
    const { cookie } = await registerUser(app);

    const res = await app.request("/bots/not-a-uuid/disable", {
      method: "POST",
      headers: { cookie },
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_request" });
  });

  it("returns 404 not_found when no bot has the given id", async () => {
    const { app } = await makeApp();
    const { cookie } = await registerUser(app);

    const res = await app.request(
      "/bots/00000000-0000-4000-8000-000000000000/disable",
      { method: "POST", headers: { cookie } },
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
  });

  it("returns 409 conflict when the bot status is draft", async () => {
    const { app } = await makeApp();
    const { cookie } = await registerUser(app);
    const created = await app.request("/bots", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ name: "Welcome Bot" }),
    });
    const createdBody = (await created.json()) as { id: string };

    const res = await app.request(`/bots/${createdBody.id}/disable`, {
      method: "POST",
      headers: { cookie },
    });

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "conflict",
      reason: "invalid_status_transition",
    });
  });

  it("disables an enabled bot and returns status disabled", async () => {
    const { app } = await makeApp();
    const { cookie } = await registerUser(app);
    const created = await app.request("/bots", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ name: "Welcome Bot" }),
    });
    const createdBody = (await created.json()) as { id: string };
    await app.request(`/bots/${createdBody.id}/token`, {
      method: "PUT",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ discordToken: "secret" }),
    });
    await app.request(`/bots/${createdBody.id}/enable`, {
      method: "POST",
      headers: { cookie },
    });

    const res = await app.request(`/bots/${createdBody.id}/disable`, {
      method: "POST",
      headers: { cookie },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.status).toBe("disabled");
  });
});
