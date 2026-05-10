import { type Bot, createBot, type Database, listBots } from "@disbot/database";

export type Bots = {
  create(input: { name: string }): Promise<Bot>;
  list(): Promise<Bot[]>;
};

export function createBots({ db }: { db: Database }): Bots {
  return {
    async create(input) {
      return createBot(db, { name: input.name });
    },
    async list() {
      return listBots(db);
    },
  };
}
