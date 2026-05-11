import { describe, expect, it } from "vitest";
import { extractSessionCookieValue, makeApp } from "../test/app-harness";

const validRegister = {
  email: "alice@example.com",
  username: "alice",
  password: "supersecret",
};

const jsonHeaders = { "content-type": "application/json" };

async function register(
  app: Awaited<ReturnType<typeof makeApp>>["app"],
  body: unknown = validRegister,
) {
  return app.request("/auth/register", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(body),
  });
}

describe("POST /auth/register", () => {
  it("creates a user, sets the session cookie, and returns the public user", async () => {
    const { app } = await makeApp();

    const res = await register(app);

    expect(res.status).toBe(201);
    const body = (await res.json()) as { user: Record<string, unknown> };
    expect(body.user).toMatchObject({
      email: "alice@example.com",
      username: "alice",
    });
    expect(body.user).not.toHaveProperty("passwordHash");
    expect(body.user).not.toHaveProperty("password_hash");
    expect(body.user.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(typeof body.user.createdAt).toBe("string");

    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toMatch(/^disbot_session=[A-Za-z0-9_-]+/);
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).toMatch(/Max-Age=604800/);
  });

  it("returns 400 invalid_request when the body fails validation", async () => {
    const { app } = await makeApp();

    const res = await register(app, {
      email: "not-an-email",
      username: "a",
      password: "x",
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_request" });
  });

  it("returns 409 with field='email' when the email is already taken", async () => {
    const { app } = await makeApp();
    await register(app);

    const res = await register(app, { ...validRegister, username: "bob" });

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "conflict", field: "email" });
  });

  it("returns 409 with field='username' when the username is already taken", async () => {
    const { app } = await makeApp();
    await register(app);

    const res = await register(app, {
      ...validRegister,
      email: "bob@example.com",
    });

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "conflict", field: "username" });
  });

  it("normalizes the email to lowercase before persistence and conflict checks", async () => {
    const { app } = await makeApp();
    await register(app, { ...validRegister, email: "Alice@Example.com" });

    const res = await register(app, {
      ...validRegister,
      username: "different",
    });

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "conflict", field: "email" });
  });
});

describe("POST /auth/login", () => {
  it("returns 200 + session cookie on correct credentials", async () => {
    const { app } = await makeApp();
    await register(app);

    const res = await app.request("/auth/login", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        email: validRegister.email,
        password: validRegister.password,
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: { email: string } };
    expect(body.user.email).toBe(validRegister.email);
    expect(res.headers.get("set-cookie") ?? "").toMatch(
      /^disbot_session=[A-Za-z0-9_-]+/,
    );
  });

  it("returns 401 with a generic message when the password is wrong", async () => {
    const { app } = await makeApp();
    await register(app);

    const res = await app.request("/auth/login", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        email: validRegister.email,
        password: "wrong-password",
      }),
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "invalid_credentials" });
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("returns the same 401 shape when the email is unknown (no enumeration)", async () => {
    const { app } = await makeApp();

    const res = await app.request("/auth/login", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        email: "ghost@example.com",
        password: validRegister.password,
      }),
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "invalid_credentials" });
  });
});

describe("POST /auth/logout", () => {
  it("clears the cookie and deletes the session when called with a valid cookie", async () => {
    const { app, sessions } = await makeApp();
    const registerRes = await register(app);
    const cookie = extractSessionCookieValue(registerRes);
    const token = cookie.split("=")[1] ?? "";

    const res = await app.request("/auth/logout", {
      method: "POST",
      headers: { cookie },
    });

    expect(res.status).toBe(204);
    expect(res.headers.get("set-cookie") ?? "").toContain("Max-Age=0");
    expect(await sessions.get(token)).toBeNull();
  });

  it("returns 401 when no session cookie is sent", async () => {
    const { app } = await makeApp();

    const res = await app.request("/auth/logout", { method: "POST" });

    expect(res.status).toBe(401);
  });

  it("returns 401 when the cookie's session has already been deleted", async () => {
    const { app } = await makeApp();
    const registerRes = await register(app);
    const cookie = extractSessionCookieValue(registerRes);
    await app.request("/auth/logout", { method: "POST", headers: { cookie } });

    const res = await app.request("/auth/logout", {
      method: "POST",
      headers: { cookie },
    });

    expect(res.status).toBe(401);
  });
});

describe("GET /auth/me", () => {
  it("returns the current user when a valid session cookie is sent", async () => {
    const { app } = await makeApp();
    const registerRes = await register(app);
    const cookie = extractSessionCookieValue(registerRes);

    const res = await app.request("/auth/me", { headers: { cookie } });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: { username: string } };
    expect(body.user.username).toBe(validRegister.username);
  });

  it("returns 401 when no cookie is sent", async () => {
    const { app } = await makeApp();

    const res = await app.request("/auth/me");

    expect(res.status).toBe(401);
  });

  it("cleans up an orphan session (token valid but user row gone) and returns 401", async () => {
    const { app, sessions } = await makeApp();
    const orphan = await sessions.create(
      "11111111-1111-4111-8111-111111111111",
    );
    const cookie = `disbot_session=${orphan.token}`;

    const res = await app.request("/auth/me", { headers: { cookie } });

    expect(res.status).toBe(401);
    expect(await sessions.get(orphan.token)).toBeNull();
  });
});

describe("CORS for /auth", () => {
  it("allows the configured WEB_ORIGIN with credentials on preflight", async () => {
    const { app } = await makeApp({ corsOrigin: "https://app.example.com" });

    const res = await app.request("/auth/login", {
      method: "OPTIONS",
      headers: {
        origin: "https://app.example.com",
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type",
      },
    });

    expect([200, 204]).toContain(res.status);
    expect(res.headers.get("access-control-allow-origin")).toBe(
      "https://app.example.com",
    );
    expect(res.headers.get("access-control-allow-credentials")).toBe("true");
    expect(
      (res.headers.get("access-control-allow-methods") ?? "").toUpperCase(),
    ).toContain("POST");
    expect(
      (res.headers.get("access-control-allow-headers") ?? "").toLowerCase(),
    ).toContain("content-type");
  });
});
