import type { BotConfig } from "@disbot/shared/dsl";
import { and, desc, eq, sql } from "drizzle-orm";
import type { Database } from "./client";
import { type Bot, type BotSummary, bots } from "./schema/bots";

export async function createBot(
  db: Database,
  userId: string,
  input: { name: string; config?: BotConfig },
): Promise<Bot> {
  const [row] = await db
    .insert(bots)
    .values({
      userId,
      name: input.name,
      ...(input.config ? { config: input.config } : {}),
    })
    .returning();
  if (!row) {
    throw new Error("createBot: insert returned no rows");
  }
  return row;
}

export async function getBotByIdAndOwner(
  db: Database,
  id: string,
  userId: string,
): Promise<Bot | null> {
  const [row] = await db
    .select()
    .from(bots)
    .where(and(eq(bots.id, id), eq(bots.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function updateBotConfig(
  db: Database,
  userId: string,
  id: string,
  config: BotConfig,
): Promise<Bot | null> {
  const [row] = await db
    .update(bots)
    .set({ config, updatedAt: sql`now()` })
    .where(and(eq(bots.id, id), eq(bots.userId, userId)))
    .returning();
  return row ?? null;
}

export async function listBots(
  db: Database,
  userId: string,
): Promise<BotSummary[]> {
  return db
    .select({
      id: bots.id,
      name: bots.name,
      createdAt: bots.createdAt,
      updatedAt: bots.updatedAt,
    })
    .from(bots)
    .where(eq(bots.userId, userId))
    .orderBy(desc(bots.createdAt));
}
