import { desc } from "drizzle-orm";
import { type Bot, bots } from "../schema/bots";
import type { Database } from "../types";

export async function createBot(
  db: Database,
  input: { name: string },
): Promise<Bot> {
  const [row] = await db.insert(bots).values({ name: input.name }).returning();
  if (!row) {
    throw new Error("createBot: insert returned no rows");
  }
  return row;
}

export async function listBots(db: Database): Promise<Bot[]> {
  return db.select().from(bots).orderBy(desc(bots.createdAt));
}
