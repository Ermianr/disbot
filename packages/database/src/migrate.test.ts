import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_FOLDER = path.resolve(here, "..", "drizzle");

describe("bots migration", () => {
  it("creates a bots table with id, name, and created_at columns", async () => {
    const client = new PGlite();
    const db = drizzle(client);

    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });

    const result = await client.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'bots'
       ORDER BY ordinal_position`,
    );
    const columnNames = result.rows.map((r) => r.column_name);

    expect(columnNames).toEqual(
      expect.arrayContaining(["id", "name", "created_at"]),
    );
  });
});
