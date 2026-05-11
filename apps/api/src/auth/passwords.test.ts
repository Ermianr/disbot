import { describe, expect, it } from "vitest";
import { bunPasswords } from "./passwords";

describe("bunPasswords.hash", () => {
  it("produces a different hash for the same input across calls", async () => {
    const a = await bunPasswords.hash("supersecret");
    const b = await bunPasswords.hash("supersecret");

    expect(a).not.toBe(b);
    expect(typeof a).toBe("string");
    expect(a.length).toBeGreaterThan(0);
  });
});

describe("bunPasswords.verify", () => {
  it("returns true when the plaintext matches the hash", async () => {
    const hash = await bunPasswords.hash("supersecret");

    expect(await bunPasswords.verify("supersecret", hash)).toBe(true);
  });

  it("returns false when the plaintext does not match", async () => {
    const hash = await bunPasswords.hash("supersecret");

    expect(await bunPasswords.verify("other", hash)).toBe(false);
  });
});
