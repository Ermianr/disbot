import type { Context } from "hono";
import type { ZodType, z } from "zod";
import { invalidRequest } from "./errors";

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: Response };

export async function validateJson<S extends ZodType>(
  c: Context,
  schema: S,
): Promise<ValidationResult<z.infer<S>>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return { ok: false, response: invalidRequest(c) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, response: invalidRequest(c) };
  }
  return { ok: true, data: parsed.data };
}
