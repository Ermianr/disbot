import { z } from "zod";

const OnError = z.enum(["stop", "continue"]).default("stop");

const SendMessageAction = z
  .object({
    type: z.enum(["send_message"]),
    content: z.string(),
    on_error: OnError,
  })
  .meta({ title: "SendMessageAction" });

const MessageCreateTrigger = z
  .object({
    event: z.enum(["message_create"]),
    actions: z.array(SendMessageAction),
  })
  .meta({ title: "MessageCreateTrigger" });

export const BotConfig = z
  .object({
    triggers: z.array(MessageCreateTrigger),
  })
  .meta({ title: "BotConfig" });

export type BotConfig = z.infer<typeof BotConfig>;
