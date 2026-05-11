import {
  type Bot,
  type BotSummary,
  createBot,
  type Database,
  getBotByIdAndOwner,
  listBots,
  updateBotConfig,
} from "@disbot/database";
import type { BotConfig } from "@disbot/shared/dsl";

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
};

export function createBots({ db }: { db: Database }): Bots {
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
  };
}
