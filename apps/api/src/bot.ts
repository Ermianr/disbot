import {
  type Bot,
  type BotSummary,
  createBot,
  type Database,
  type DbError,
  disableBot,
  enableBot,
  getBotByIdAndOwner,
  listBots,
  type Result,
  updateBotConfig,
  updateBotToken,
} from "@disbot/database";
import type { BotConfig } from "@disbot/shared/dsl";
import { encrypt } from "./crypto/token-crypto";

export type EnableResult =
  | { kind: "ok"; bot: Bot }
  | { kind: "not_found" }
  | { kind: "conflict"; reason: "bot_has_no_token" | "invalid_status_transition" };

export type DisableResult = EnableResult;

export type Bots = {
  create(
    userId: string,
    input: { name: string; config?: BotConfig },
  ): Promise<Result<Bot, DbError>>;
  list(userId: string): Promise<Result<BotSummary[], DbError>>;
  get(userId: string, id: string): Promise<Result<Bot | null, DbError>>;
  updateConfig(
    userId: string,
    id: string,
    config: BotConfig,
  ): Promise<Result<Bot | null, DbError>>;
  setToken(
    userId: string,
    id: string,
    discordToken: string,
  ): Promise<Result<Bot | null, DbError>>;
  enable(userId: string, id: string): Promise<Result<EnableResult, DbError>>;
  disable(userId: string, id: string): Promise<Result<DisableResult, DbError>>;
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
      return createBot(db, userId, {
        name: input.name,
        config: input.config,
      });
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
      const enableResult = await enableBot(db, userId, id);
      if (!enableResult.ok) return enableResult;

      if (!enableResult.value) {
        const botResult = await getBotByIdAndOwner(db, id, userId);
        if (!botResult.ok) return botResult;
        const bot = botResult.value;
        if (!bot) return { ok: true, value: { kind: "not_found" as const } };
        if (!bot.discordToken) {
          return {
            ok: true,
            value: { kind: "conflict" as const, reason: "bot_has_no_token" },
          };
        }
        return {
          ok: true,
          value: { kind: "conflict" as const, reason: "invalid_status_transition" },
        };
      }

      const botResult = await getBotByIdAndOwner(db, id, userId);
      if (!botResult.ok) return botResult;
      if (!botResult.value) {
        return { ok: true, value: { kind: "not_found" as const } };
      }
      return {
        ok: true,
        value: { kind: "ok" as const, bot: botResult.value },
      };
    },
    async disable(userId, id) {
      const disableResult = await disableBot(db, userId, id);
      if (!disableResult.ok) return disableResult;

      if (!disableResult.value) {
        const botResult = await getBotByIdAndOwner(db, id, userId);
        if (!botResult.ok) return botResult;
        const bot = botResult.value;
        if (!bot) return { ok: true, value: { kind: "not_found" as const } };
        return {
          ok: true,
          value: { kind: "conflict" as const, reason: "invalid_status_transition" },
        };
      }

      const botResult = await getBotByIdAndOwner(db, id, userId);
      if (!botResult.ok) return botResult;
      if (!botResult.value) {
        return { ok: true, value: { kind: "not_found" as const } };
      }
      return {
        ok: true,
        value: { kind: "ok" as const, bot: botResult.value },
      };
    },
  };
}
