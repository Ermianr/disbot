import { randomUUID } from "node:crypto";
import { BOT_CONFIG_EMPTY, type BotConfig } from "@disbot/shared/dsl";
import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

export const bots = pgTable("bots", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  config: jsonb("config")
    .$type<BotConfig>()
    .notNull()
    .default(BOT_CONFIG_EMPTY),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Bot = typeof bots.$inferSelect;
export type NewBot = typeof bots.$inferInsert;
export type BotSummary = Pick<Bot, "id" | "name" | "createdAt" | "updatedAt">;
