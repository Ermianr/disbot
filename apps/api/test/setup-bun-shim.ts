import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

type BunPasswordLike = {
  hash(plain: string, options?: { algorithm?: string }): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
};

const KEY_LEN = 32;
const SALT_LEN = 16;
const SCRYPT_PREFIX = "scrypt$";

const shim: BunPasswordLike = {
  async hash(plain) {
    const salt = randomBytes(SALT_LEN);
    const derived = scryptSync(plain, salt, KEY_LEN);
    return `${SCRYPT_PREFIX}${salt.toString("hex")}$${derived.toString("hex")}`;
  },
  async verify(plain, hash) {
    if (!hash.startsWith(SCRYPT_PREFIX)) return false;
    const [, saltHex, derivedHex] = hash.split("$");
    if (!saltHex || !derivedHex) return false;
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(derivedHex, "hex");
    if (expected.length !== KEY_LEN) return false;
    const actual = scryptSync(plain, salt, KEY_LEN);
    return timingSafeEqual(expected, actual);
  },
};

if (typeof (globalThis as { Bun?: unknown }).Bun === "undefined") {
  (globalThis as { Bun: { password: BunPasswordLike } }).Bun = {
    password: shim,
  };
}
