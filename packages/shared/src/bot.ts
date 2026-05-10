import { z } from "zod";

export const CreateBotRequest = z.object({
  name: z.string().min(1),
});

export type CreateBotRequest = z.infer<typeof CreateBotRequest>;
