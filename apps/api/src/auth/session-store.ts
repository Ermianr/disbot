import { randomBytes } from "node:crypto";

export type Session = {
  userId: string;
  createdAt: Date;
};

export type SessionStore = {
  create(userId: string): Promise<{ token: string; session: Session }>;
  get(token: string): Promise<Session | null>;
  touch(token: string): Promise<void>;
  delete(token: string): Promise<void>;
};

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

type Entry = {
  session: Session;
  expiresAtMs: number;
};

export function createInMemorySessionStore(options: {
  ttlMs: number;
  now?: () => number;
}): SessionStore {
  const { ttlMs } = options;
  const now = options.now ?? (() => Date.now());
  const entries = new Map<string, Entry>();

  function isExpired(entry: Entry): boolean {
    return now() >= entry.expiresAtMs;
  }

  return {
    async create(userId) {
      const token = generateSessionToken();
      const session: Session = {
        userId,
        createdAt: new Date(now()),
      };
      entries.set(token, { session, expiresAtMs: now() + ttlMs });
      return { token, session };
    },
    async get(token) {
      const entry = entries.get(token);
      if (!entry) return null;
      if (isExpired(entry)) {
        entries.delete(token);
        return null;
      }
      return entry.session;
    },
    async touch(token) {
      const entry = entries.get(token);
      if (!entry) return;
      if (isExpired(entry)) {
        entries.delete(token);
        return;
      }
      entry.expiresAtMs = now() + ttlMs;
    },
    async delete(token) {
      entries.delete(token);
    },
  };
}
