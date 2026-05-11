import { randomUUID } from "node:crypto";
import { BOT_CONFIG_EMPTY, type BotConfig } from "@disbot/shared/dsl";
import {
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const botStatusEnum = pgEnum("bot_status", [
  "draft",
  "enabled",
  "disabled",
  "error",
  "rate_limited",
]);

export const bots = pgTable("bots", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  status: botStatusEnum("status").notNull().default("draft"),
  discordToken: text("discord_token"),
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
export type BotSummary = Pick<
  Bot,
  "id" | "name" | "status" | "createdAt" | "updatedAt"
> & {
  hasToken: boolean;
};
