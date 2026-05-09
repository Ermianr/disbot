import { describe, expect, it, vi } from "vitest";
import { getHealth } from "./api";

describe("getHealth", () => {
  it("returns health status from API", async () => {
    globalThis.fetch = vi.fn(() =>
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
    globalThis.fetch = vi.fn(() =>
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
