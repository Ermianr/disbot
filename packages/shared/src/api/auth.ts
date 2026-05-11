import { z } from "zod";

export const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,32}$/;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

const NormalizedEmail = z.string().trim().toLowerCase().email();

export const RegisterRequest = z.object({
  email: NormalizedEmail,
  username: z.string().regex(USERNAME_PATTERN),
  password: z.string().min(PASSWORD_MIN).max(PASSWORD_MAX),
});

export type RegisterRequest = z.infer<typeof RegisterRequest>;

export const LoginRequest = z.object({
  email: NormalizedEmail,
  password: z.string().min(1).max(PASSWORD_MAX),
});

export type LoginRequest = z.infer<typeof LoginRequest>;

export const PublicUser = z.object({
  id: z.uuid(),
  email: z.string(),
  username: z.string(),
  createdAt: z.string(),
});

export type PublicUser = z.infer<typeof PublicUser>;
