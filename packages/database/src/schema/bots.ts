import { randomUUID } from "node:crypto";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const bots = pgTable("bots", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Bot = typeof bots.$inferSelect;
export type NewBot = typeof bots.$inferInsert;
