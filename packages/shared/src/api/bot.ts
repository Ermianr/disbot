import { z } from "zod";
import { BotConfig } from "../dsl/bot-config";

export const CreateBotRequest = z.object({
  name: z.string().min(1),
  config: BotConfig.optional(),
});

export type CreateBotRequest = z.infer<typeof CreateBotRequest>;

export const SetBotTokenRequest = z.object({
  discordToken: z.string().min(1),
});

export type SetBotTokenRequest = z.infer<typeof SetBotTokenRequest>;

export const BotStatus = z.enum([
  "draft",
  "enabled",
  "disabled",
  "error",
  "rate_limited",
]);

export const PublicBot = z.object({
  id: z.uuid(),
  name: z.string(),
  status: BotStatus,
  hasToken: z.boolean(),
  config: BotConfig.optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type PublicBot = z.infer<typeof PublicBot>;
