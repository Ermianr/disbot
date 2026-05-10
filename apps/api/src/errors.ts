import type { Context } from "hono";

export function invalidRequest(c: Context): Response {
  return c.json({ error: "invalid_request" }, 400);
}

export function notFound(c: Context): Response {
  return c.json({ error: "not_found" }, 404);
}
