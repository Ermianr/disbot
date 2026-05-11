import { eq } from "drizzle-orm";
import type { Database } from "./client";
import { type UserRow, users } from "./schema/users";

export class UserConflictError extends Error {
  readonly field: "email" | "username";

  constructor(field: "email" | "username") {
    super(`User ${field} already exists`);
    this.name = "UserConflictError";
    this.field = field;
  }
}

export type CreateUserInput = {
  email: string;
  username: string;
  passwordHash: string;
};

export async function createUser(
  db: Database,
  input: CreateUserInput,
): Promise<UserRow> {
  try {
    const [row] = await db.insert(users).values(input).returning();
    if (!row) throw new Error("createUser: insert returned no rows");
    return row;
  } catch (err) {
    const field = uniqueViolationField(err);
    if (field) throw new UserConflictError(field);
    throw err;
  }
}

export async function findUserByEmail(
  db: Database,
  email: string,
): Promise<UserRow | null> {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return row ?? null;
}

export async function findUserByUsername(
  db: Database,
  username: string,
): Promise<UserRow | null> {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  return row ?? null;
}

export async function findUserById(
  db: Database,
  id: string,
): Promise<UserRow | null> {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}

function uniqueViolationField(err: unknown): "email" | "username" | null {
  const constraint = uniqueViolationConstraint(err);
  if (constraint === "users_email_unique") return "email";
  if (constraint === "users_username_unique") return "username";
  return null;
}

function uniqueViolationConstraint(err: unknown): string | null {
  for (const candidate of unwrapCauses(err)) {
    if (!candidate || typeof candidate !== "object") continue;
    const obj = candidate as { code?: unknown; constraint?: unknown };
    if (obj.code !== "23505") continue;
    if (typeof obj.constraint === "string") return obj.constraint;
  }
  return null;
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
