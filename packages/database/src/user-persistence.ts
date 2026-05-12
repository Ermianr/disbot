import { eq } from "drizzle-orm";
import type { Database } from "./client";
import type { DbError } from "./db-error";
import { defaultAdapter } from "./error-adapter";
import type { Result } from "./result";
import { type UserRow, users } from "./schema/users";

export type CreateUserInput = {
  email: string;
  username: string;
  passwordHash: string;
};

export async function createUser(
  db: Database,
  input: CreateUserInput,
): Promise<Result<UserRow, DbError>> {
  return defaultAdapter.adapt(async () => {
    const [row] = await db.insert(users).values(input).returning();
    if (!row) throw new Error("createUser: insert returned no rows");
    return row;
  });
}

export async function findUserByEmail(
  db: Database,
  email: string,
): Promise<Result<UserRow | null, DbError>> {
  return defaultAdapter.adapt(async () => {
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return row ?? null;
  });
}

export async function findUserByUsername(
  db: Database,
  username: string,
): Promise<Result<UserRow | null, DbError>> {
  return defaultAdapter.adapt(async () => {
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return row ?? null;
  });
}

export async function findUserById(
  db: Database,
  id: string,
): Promise<Result<UserRow | null, DbError>> {
  return defaultAdapter.adapt(async () => {
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return row ?? null;
  });
}
