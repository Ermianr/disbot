import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { validateJson } from "./validate";

const schema = z.object({ name: z.string().min(1) });

function buildApp() {
  const app = new Hono();
  app.post("/v", async (c) => {
    const result = await validateJson(c, schema);
    if (!result.ok) return result.response;
    return c.json({ data: result.data });
  });
  return app;
}

describe("validateJson", () => {
  it("returns ok with parsed data for a valid body", async () => {
    const app = buildApp();

    const res = await app.request("/v", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "ok" }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { name: "ok" } });
  });

  it("returns a canonical 400 when the body fails the schema", async () => {
    const app = buildApp();

    const res = await app.request("/v", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_request" });
  });

  it("returns a canonical 400 when the body is not valid JSON", async () => {
    const app = buildApp();

    const res = await app.request("/v", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json",
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_request" });
  });
});
