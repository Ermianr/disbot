import { describe, expect, it } from "vitest";
import { decrypt, encrypt } from "./token-crypto";

const MASTER_KEY = Buffer.from("a".repeat(32));

describe("encrypt / decrypt round-trip", () => {
  it("recovers the original plaintext after encrypting and decrypting", () => {
    const plain = "my-secret-discord-token";

    const cipher = encrypt(plain, MASTER_KEY);
    const recovered = decrypt(cipher, MASTER_KEY);

    expect(recovered).toBe(plain);
  });

  it("produces different ciphertexts for the same plaintext", () => {
    const plain = "my-secret-discord-token";

    const cipher1 = encrypt(plain, MASTER_KEY);
    const cipher2 = encrypt(plain, MASTER_KEY);

    expect(cipher1).not.toBe(cipher2);
  });

  it("throws when decrypting with the wrong key", () => {
    const plain = "my-secret-discord-token";
    const cipher = encrypt(plain, MASTER_KEY);
    const wrongKey = Buffer.from("b".repeat(32));

    expect(() => decrypt(cipher, wrongKey)).toThrow();
  });

  it("throws when decrypting corrupted ciphertext", () => {
    const plain = "my-secret-discord-token";
    const cipher = encrypt(plain, MASTER_KEY);
    const corrupted = `${cipher.slice(0, -4)}XXXX`;

    expect(() => decrypt(corrupted, MASTER_KEY)).toThrow();
  });

  it("throws when the master key is not 32 bytes", () => {
    const shortKey = Buffer.from("too-short");

    expect(() => encrypt("plain", shortKey)).toThrow(
      "master key must be 32 bytes",
    );
  });
});
