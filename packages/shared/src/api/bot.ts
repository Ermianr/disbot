import { z } from "zod";
import { BotConfig } from "../dsl/bot-config";

export const CreateBotRequest = z.object({
  name: z.string().min(1),
  config: BotConfig.optional(),
});

export type CreateBotRequest = z.infer<typeof CreateBotRequest>;
