import type { Session, SessionStore } from "./session-store";
import { generateSessionToken } from "./session-store";

type RedisLike = {
  set(key: string, value: string, ...args: string[]): Promise<unknown>;
  get(key: string): Promise<string | null>;
  expire(key: string, seconds: number): Promise<unknown>;
  del(key: string): Promise<unknown>;
};

const KEY_PREFIX = "session:";

function key(token: string): string {
  return `${KEY_PREFIX}${token}`;
}

type StoredSession = {
  userId: string;
  createdAt: string;
};

export function createRedisSessionStore(
  redis: RedisLike,
  ttlMs: number,
): SessionStore {
  const ttlSeconds = Math.floor(ttlMs / 1000);

  return {
    async create(userId) {
      const token = generateSessionToken();
      const session: Session = { userId, createdAt: new Date() };
      const stored: StoredSession = {
        userId,
        createdAt: session.createdAt.toISOString(),
      };
      await redis.set(
        key(token),
        JSON.stringify(stored),
        "EX",
        String(ttlSeconds),
      );
      return { token, session };
    },
    async get(token) {
      const raw = await redis.get(key(token));
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw) as StoredSession;
        if (typeof parsed.userId !== "string" || parsed.userId.length === 0) {
          return null;
        }
        const createdAt = new Date(parsed.createdAt);
        if (!Number.isFinite(createdAt.getTime())) {
          return null;
        }
        return {
          userId: parsed.userId,
          createdAt,
        };
      } catch {
        return null;
      }
    },
    async touch(token) {
      await redis.expire(key(token), ttlSeconds);
    },
    async delete(token) {
      await redis.del(key(token));
    },
  };
}
