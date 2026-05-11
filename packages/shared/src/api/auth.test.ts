import { describe, expect, it } from "vitest";
import { LoginRequest, RegisterRequest } from "./auth";

describe("RegisterRequest", () => {
  it("trims and lowercases the email", () => {
    const parsed = RegisterRequest.parse({
      email: "  Alice@Example.COM  ",
      username: "alice",
      password: "supersecret",
    });

    expect(parsed.email).toBe("alice@example.com");
  });

  it("accepts a 3-character alphanumeric username", () => {
    expect(() =>
      RegisterRequest.parse({
        email: "a@example.com",
        username: "ali",
        password: "supersecret",
      }),
    ).not.toThrow();
  });

  it("rejects a 2-character username", () => {
    expect(() =>
      RegisterRequest.parse({
        email: "a@example.com",
        username: "al",
        password: "supersecret",
      }),
    ).toThrow();
  });

  it("rejects usernames with disallowed characters", () => {
    expect(() =>
      RegisterRequest.parse({
        email: "a@example.com",
        username: "alice space",
        password: "supersecret",
      }),
    ).toThrow();
  });

  it("rejects passwords shorter than 8", () => {
    expect(() =>
      RegisterRequest.parse({
        email: "a@example.com",
        username: "alice",
        password: "short",
      }),
    ).toThrow();
  });

  it("rejects passwords longer than 128", () => {
    expect(() =>
      RegisterRequest.parse({
        email: "a@example.com",
        username: "alice",
        password: "x".repeat(129),
      }),
    ).toThrow();
  });
});

describe("LoginRequest", () => {
  it("normalizes the email and accepts any non-empty password", () => {
    const parsed = LoginRequest.parse({
      email: " Bob@Example.com",
      password: "anything",
    });

    expect(parsed.email).toBe("bob@example.com");
  });

  it("rejects empty passwords", () => {
    expect(() =>
      LoginRequest.parse({ email: "a@example.com", password: "" }),
    ).toThrow();
  });
});
