import type { UserRow } from "@disbot/database";
import type { PublicUser } from "@disbot/shared/api";

export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    createdAt: row.createdAt.toISOString(),
  };
}
