import { describe, expect, it, vi } from "vitest";
import { createBot, getBots, getHealth } from "./api";

function mockFetch(impl: () => Promise<Response>) {
  globalThis.fetch = vi.fn(impl) as unknown as typeof fetch;
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
    expect(fetch).toHaveBeenCalledWith("http://localhost:3000/health");
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
  it("fetches GET /bots and returns the parsed list", async () => {
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
    expect(fetch).toHaveBeenCalledWith("http://localhost:3000/bots");
  });

  it("throws when API returns non-ok status", async () => {
    mockFetch(() => Promise.resolve({ ok: false, status: 500 } as Response));

    await expect(getBots("http://localhost:3000")).rejects.toThrow(
      "Failed to fetch bots",
    );
  });
});

describe("createBot", () => {
  it("posts to /bots with the name and returns the created bot", async () => {
    const bot = {
      id: "1",
      name: "Alpha",
      createdAt: "2026-05-09T00:00:00Z",
      updatedAt: "2026-05-09T00:00:00Z",
    };
    mockFetch(() =>
      Promise.resolve({
        ok: true,
        status: 201,
        json: () => Promise.resolve(bot),
      } as Response),
    );

    const result = await createBot("http://localhost:3000", "Alpha");

    expect(result).toEqual(bot);
    expect(fetch).toHaveBeenCalledWith("http://localhost:3000/bots", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Alpha" }),
    });
  });

  it("throws when API returns non-ok status", async () => {
    mockFetch(() => Promise.resolve({ ok: false, status: 400 } as Response));

    await expect(createBot("http://localhost:3000", "Alpha")).rejects.toThrow(
      "Failed to create bot",
    );
  });
});
