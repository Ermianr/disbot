import { describe, expect, it, vi } from "vitest";
import {
  createBot,
  getBots,
  getHealth,
  getMe,
  login,
  logout,
  register,
} from "./api";

function mockFetch(
  impl: (url: string, init?: RequestInit) => Promise<Response>,
) {
  globalThis.fetch = vi.fn(impl) as unknown as typeof fetch;
}

function captureFetch() {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  mockFetch((url, init) => {
    calls.push({ url: String(url), init });
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    } as Response);
  });
  return calls;
}

describe("getHealth", () => {
  it("returns health status from API", async () => {
    mockFetch(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: "ok" }),
      } as Response),
    );

    const result = await getHealth("http://localhost:3000");

    expect(result).toEqual({ status: "ok" });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/health",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("throws when API returns non-ok status", async () => {
    mockFetch(() =>
      Promise.resolve({
        ok: false,
        status: 500,
      } as Response),
    );

    await expect(getHealth("http://localhost:3000")).rejects.toThrow(
      "Health check failed",
    );
  });
});

describe("getBots", () => {
  it("fetches GET /bots with credentials: include and returns the parsed list", async () => {
    const bots = [
      {
        id: "1",
        name: "Alpha",
        createdAt: "2026-05-09T00:00:00Z",
        updatedAt: "2026-05-09T00:00:00Z",
      },
    ];
    mockFetch(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(bots),
      } as Response),
    );

    const result = await getBots("http://localhost:3000");

    expect(result).toEqual(bots);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/bots",
      expect.objectContaining({ credentials: "include" }),
    );
  });
});

describe("createBot", () => {
  it("posts to /bots with credentials: include", async () => {
    mockFetch(() =>
      Promise.resolve({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ id: "1", name: "Alpha" }),
      } as Response),
    );

    await createBot("http://localhost:3000", "Alpha");

    const call = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call?.[0]).toBe("http://localhost:3000/bots");
    expect(call?.[1]).toMatchObject({
      method: "POST",
      credentials: "include",
    });
  });
});

describe("getMe", () => {
  it("GETs /auth/me with credentials: include and returns the user", async () => {
    const user = {
      id: "u1",
      email: "a@b.com",
      username: "alice",
      createdAt: "2026-05-09T00:00:00Z",
    };
    mockFetch(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ user }),
      } as Response),
    );

    const result = await getMe("http://localhost:3000");

    expect(result).toEqual(user);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/auth/me",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("returns null when API responds 401", async () => {
    mockFetch(() => Promise.resolve({ ok: false, status: 401 } as Response));

    expect(await getMe("http://localhost:3000")).toBeNull();
  });

  it("forwards a provided cookie header (for SSR)", async () => {
    const calls = captureFetch();

    await getMe("http://localhost:3000", { cookie: "disbot_session=abc" });

    expect(calls[0]?.init?.headers).toBeDefined();
    const headers = new Headers(calls[0]?.init?.headers);
    expect(headers.get("cookie")).toBe("disbot_session=abc");
  });
});

describe("login", () => {
  it("POSTs to /auth/login with JSON body and credentials: include", async () => {
    mockFetch(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            user: {
              id: "u1",
              email: "a@b.com",
              username: "alice",
              createdAt: "x",
            },
          }),
      } as Response),
    );

    const user = await login("http://localhost:3000", {
      email: "a@b.com",
      password: "supersecret",
    });

    expect(user.email).toBe("a@b.com");
    const call = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call?.[0]).toBe("http://localhost:3000/auth/login");
    expect(call?.[1]).toMatchObject({
      method: "POST",
      credentials: "include",
    });
    expect(JSON.parse((call?.[1] as RequestInit).body as string)).toEqual({
      email: "a@b.com",
      password: "supersecret",
    });
  });

  it("throws a tagged error on 401", async () => {
    mockFetch(() => Promise.resolve({ ok: false, status: 401 } as Response));

    await expect(
      login("http://localhost:3000", { email: "x", password: "y" }),
    ).rejects.toThrow("Invalid credentials");
  });
});

describe("register", () => {
  it("POSTs to /auth/register with JSON body and credentials: include", async () => {
    mockFetch(() =>
      Promise.resolve({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            user: {
              id: "u1",
              email: "a@b.com",
              username: "alice",
              createdAt: "x",
            },
          }),
      } as Response),
    );

    const user = await register("http://localhost:3000", {
      email: "a@b.com",
      username: "alice",
      password: "supersecret",
    });

    expect(user.username).toBe("alice");
    const call = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call?.[1]).toMatchObject({
      method: "POST",
      credentials: "include",
    });
  });

  it("throws a specific error when register returns 409 (conflict)", async () => {
    mockFetch(() =>
      Promise.resolve({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ error: "conflict", field: "email" }),
      } as Response),
    );

    await expect(
      register("http://localhost:3000", {
        email: "a@b.com",
        username: "alice",
        password: "supersecret",
      }),
    ).rejects.toMatchObject({ message: expect.stringContaining("email") });
  });
});

describe("logout", () => {
  it("POSTs to /auth/logout with credentials: include", async () => {
    mockFetch(() =>
      Promise.resolve({
        ok: true,
        status: 204,
        json: () => Promise.resolve(null),
      } as Response),
    );

    await logout("http://localhost:3000");

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/auth/logout",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      }),
    );
  });
});
