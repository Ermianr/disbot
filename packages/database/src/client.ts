import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const here = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_FOLDER = path.resolve(here, "..", "drizzle");

export function createDb(connectionString: string) {
  const sql = postgres(connectionString);
  return drizzle(sql);
}

export type ProductionDb = ReturnType<typeof createDb>;

export async function runMigrations(db: ProductionDb): Promise<void> {
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}
