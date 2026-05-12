import type { DbError } from "@disbot/database";
import type { Context } from "hono";

export function invalidRequest(c: Context): Response {
  return c.json({ error: "invalid_request" }, 400);
}

export function notFound(c: Context): Response {
  return c.json({ error: "not_found" }, 404);
}

export function conflict(c: Context, reason: string): Response {
  return c.json({ error: "conflict", reason }, 409);
}

export function dbError(c: Context, error: DbError): Response {
  switch (error.kind) {
    case "notFound":
      return c.json({ error: "not_found" }, 404);
    case "conflict":
      return c.json({ error: "conflict", field: error.field }, 409);
    case "constraintFailed":
      return c.json({ error: "constraint_failed" }, 422);
    case "connectionFailed":
      return c.json({ error: "service_unavailable" }, 503);
    case "unexpected":
      return c.json({ error: "internal_server_error" }, 500);
  }
}
