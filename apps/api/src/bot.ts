import {
  type Bot,
  type BotSummary,
  createBot,
  type Database,
  getBotByIdAndOwner,
  listBots,
  updateBotConfig,
  updateBotStatus,
  updateBotToken,
} from "@disbot/database";
import type { BotConfig } from "@disbot/shared/dsl";
import { encrypt } from "./crypto/token-crypto";

export type EnableResult =
  | { kind: "ok"; bot: Bot }
  | { kind: "not_found" }
  | { kind: "conflict"; reason: string };

export type DisableResult = EnableResult;

export type Bots = {
  create(
    userId: string,
    input: { name: string; config?: BotConfig },
  ): Promise<Bot>;
  list(userId: string): Promise<BotSummary[]>;
  get(userId: string, id: string): Promise<Bot | null>;
  updateConfig(
    userId: string,
    id: string,
    config: BotConfig,
  ): Promise<Bot | null>;
  setToken(
    userId: string,
    id: string,
    discordToken: string,
  ): Promise<Bot | null>;
  enable(userId: string, id: string): Promise<EnableResult>;
  disable(userId: string, id: string): Promise<DisableResult>;
};

export function createBots({
  db,
  tokenMasterKey,
}: {
  db: Database;
  tokenMasterKey: Buffer;
}): Bots {
  return {
    async create(userId, input) {
      return createBot(db, userId, { name: input.name, config: input.config });
    },
    async list(userId) {
      return listBots(db, userId);
    },
    async get(userId, id) {
      return getBotByIdAndOwner(db, id, userId);
    },
    async updateConfig(userId, id, config) {
      return updateBotConfig(db, userId, id, config);
    },
    async setToken(userId, id, discordToken) {
      const encrypted = encrypt(discordToken, tokenMasterKey);
      return updateBotToken(db, userId, id, encrypted);
    },
    async enable(userId, id) {
      const bot = await getBotByIdAndOwner(db, id, userId);
      if (!bot) return { kind: "not_found" };
      if (!bot.discordToken) {
        return { kind: "conflict", reason: "bot_has_no_token" };
      }
      if (bot.status !== "draft" && bot.status !== "disabled") {
        return { kind: "conflict", reason: "invalid_status_transition" };
      }
      const updated = await updateBotStatus(db, userId, id, "enabled");
      if (!updated) return { kind: "not_found" };
      return { kind: "ok", bot: updated };
    },
    async disable(userId, id) {
      const bot = await getBotByIdAndOwner(db, id, userId);
      if (!bot) return { kind: "not_found" };
      if (
        bot.status !== "enabled" &&
        bot.status !== "error" &&
        bot.status !== "rate_limited"
      ) {
        return { kind: "conflict", reason: "invalid_status_transition" };
      }
      const updated = await updateBotStatus(db, userId, id, "disabled");
      if (!updated) return { kind: "not_found" };
      return { kind: "ok", bot: updated };
    },
  };
}
