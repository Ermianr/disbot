import type { BotConfig } from "@disbot/shared/dsl";
import { desc, eq, sql } from "drizzle-orm";
import type { Database } from "./client";
import { type Bot, type BotSummary, bots } from "./schema/bots";

export async function createBot(
  db: Database,
  input: { name: string; config?: BotConfig },
): Promise<Bot> {
  const [row] = await db
    .insert(bots)
    .values({
      name: input.name,
      ...(input.config ? { config: input.config } : {}),
    })
    .returning();
  if (!row) {
    throw new Error("createBot: insert returned no rows");
  }
  return row;
}

export async function getBotById(
  db: Database,
  id: string,
): Promise<Bot | null> {
  const [row] = await db.select().from(bots).where(eq(bots.id, id)).limit(1);
  return row ?? null;
}

export async function updateBotConfig(
  db: Database,
  id: string,
  config: BotConfig,
): Promise<Bot | null> {
  const [row] = await db
    .update(bots)
    .set({ config, updatedAt: sql`now()` })
    .where(eq(bots.id, id))
    .returning();
  return row ?? null;
}

export async function listBots(db: Database): Promise<BotSummary[]> {
  return db
    .select({
      id: bots.id,
      name: bots.name,
      createdAt: bots.createdAt,
      updatedAt: bots.updatedAt,
    })
    .from(bots)
    .orderBy(desc(bots.createdAt));
}
