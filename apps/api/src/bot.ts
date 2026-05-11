import {
  type Bot,
  type BotSummary,
  createBot,
  type Database,
  disableBot,
  enableBot,
  getBotByIdAndOwner,
  listBots,
  updateBotConfig,
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
      const updated = await enableBot(db, userId, id);
      if (!updated) {
        const bot = await getBotByIdAndOwner(db, id, userId);
        if (!bot) return { kind: "not_found" };
        if (!bot.discordToken) {
          return { kind: "conflict", reason: "bot_has_no_token" };
        }
        return { kind: "conflict", reason: "invalid_status_transition" };
      }
      return { kind: "ok", bot: updated };
    },
    async disable(userId, id) {
      const updated = await disableBot(db, userId, id);
      if (!updated) {
        const bot = await getBotByIdAndOwner(db, id, userId);
        if (!bot) return { kind: "not_found" };
        return { kind: "conflict", reason: "invalid_status_transition" };
      }
      return { kind: "ok", bot: updated };
    },
  };
}
