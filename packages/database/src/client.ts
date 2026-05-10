import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const here = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_FOLDER = path.resolve(here, "..", "drizzle");

export type Database = PgDatabase<PgQueryResultHKT>;

export function createDb(connectionString: string) {
  const sql = postgres(connectionString);
  return drizzle(sql);
}

export async function runMigrations(
  db: ReturnType<typeof createDb>,
): Promise<void> {
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}
