import type { Result } from "./result";
import { ok, err } from "./result";
import type { DbError } from "./db-error";

export interface ErrorAdapter {
  adapt<T>(operation: () => Promise<T>): Promise<Result<T, DbError>>;
}

export const defaultAdapter: ErrorAdapter = {
  async adapt<T>(operation: () => Promise<T>): Promise<Result<T, DbError>> {
    try {
      const value = await operation();
      return ok(value);
    } catch (raw) {
      return err(classify(raw));
    }
  },
};

export function classify(raw: unknown): DbError {
  for (const candidate of unwrapCauses(raw)) {
    if (!candidate || typeof candidate !== "object") continue;
    const obj = candidate as {
      code?: unknown;
      constraint?: unknown;
      message?: unknown;
      name?: unknown;
    };

    if (typeof obj.code === "string") {
      if (obj.code === "23505") {
        const field = constraintToField(obj.constraint);
        const constraint =
          typeof obj.constraint === "string" ? obj.constraint : "unknown";
        return { kind: "conflict", field, constraint };
      }

      if (obj.code === "23503") {
        return {
          kind: "constraintFailed",
          message:
            typeof obj.message === "string"
              ? obj.message
              : "Foreign key violation",
        };
      }

      if (obj.code.startsWith("08")) {
        return {
          kind: "connectionFailed",
          message:
            typeof obj.message === "string"
              ? obj.message
              : "Database connection failed",
        };
      }
    }

    if (obj.name === "PostgresError" && typeof obj.message === "string") {
      if (obj.message.includes("Connection")) {
        return { kind: "connectionFailed", message: obj.message };
      }
    }
  }

  return {
    kind: "unexpected",
    message: errorMessage(raw),
  };
}

function constraintToField(constraint: unknown): string {
  if (typeof constraint !== "string") return "unknown";
  if (constraint === "users_email_unique") return "email";
  if (constraint === "users_username_unique") return "username";
  return "unknown";
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return String(err);
  } catch {
    return "Unknown error";
  }
}

function* unwrapCauses(err: unknown): Iterable<unknown> {
  let current = err;
  const seen = new Set<unknown>();
  while (current && !seen.has(current)) {
    seen.add(current);
    yield current;
    current = (current as { cause?: unknown }).cause;
  }
}
