import {
  type Bot,
  type BotSummary,
  createBot,
  type Database,
  getBotById,
  listBots,
  updateBotConfig,
} from "@disbot/database";
import type { BotConfig } from "@disbot/shared/dsl";

export type Bots = {
  create(input: { name: string; config?: BotConfig }): Promise<Bot>;
  list(): Promise<BotSummary[]>;
  get(id: string): Promise<Bot | null>;
  updateConfig(id: string, config: BotConfig): Promise<Bot | null>;
};

export function createBots({ db }: { db: Database }): Bots {
  return {
    async create(input) {
      return createBot(db, { name: input.name, config: input.config });
    },
    async list() {
      return listBots(db);
    },
    async get(id) {
      return getBotById(db, id);
    },
    async updateConfig(id, config) {
      return updateBotConfig(db, id, config);
    },
  };
}
