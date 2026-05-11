import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_FOLDER = path.resolve(here, "..", "drizzle");

describe("bots migration", () => {
  it("creates a bots table with id, name, created_at, config, and updated_at columns", async () => {
    const client = new PGlite();
    const db = drizzle(client);

    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });

    const result = await client.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'bots'
       ORDER BY ordinal_position`,
    );
    const columnNames = result.rows.map((r) => r.column_name);

    expect(columnNames).toEqual([
      "id",
      "name",
      "created_at",
      "config",
      "updated_at",
    ]);
  });
});

describe("users migration", () => {
  it("creates a users table with id, email, username, password_hash, created_at, updated_at", async () => {
    const client = new PGlite();
    const db = drizzle(client);

    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });

    const result = await client.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'users'
       ORDER BY ordinal_position`,
    );
    const columnNames = result.rows.map((r) => r.column_name);

    expect(columnNames).toEqual([
      "id",
      "email",
      "username",
      "password_hash",
      "created_at",
      "updated_at",
    ]);
  });

  it("enforces unique email and unique username", async () => {
    const client = new PGlite();
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });

    await client.query(
      `INSERT INTO users (id, email, username, password_hash)
       VALUES ('11111111-1111-4111-8111-111111111111', 'a@example.com', 'alice', 'x')`,
    );

    await expect(
      client.query(
        `INSERT INTO users (id, email, username, password_hash)
         VALUES ('22222222-2222-4222-8222-222222222222', 'a@example.com', 'bob', 'x')`,
      ),
    ).rejects.toThrow();

    await expect(
      client.query(
        `INSERT INTO users (id, email, username, password_hash)
         VALUES ('33333333-3333-4333-8333-333333333333', 'b@example.com', 'alice', 'x')`,
      ),
    ).rejects.toThrow();
  });
});
