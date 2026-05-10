import { createDb, runMigrations } from "@disbot/database";
import { createApp } from "./app";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const db = createDb(connectionString);
await runMigrations(db);

const app = createApp({ db });

const port = Number(process.env.PORT) || 3000;

const server = Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`API running at http://localhost:${server.port}`);
