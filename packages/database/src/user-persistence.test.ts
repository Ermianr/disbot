import { describe, expect, it } from "vitest";
import { freshDb, unwrap } from "./test-utils";
import {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByUsername,
} from "./user-persistence";

const sample = {
  email: "alice@example.com",
  username: "alice",
  passwordHash: "hash",
};

describe("createUser", () => {
  it("persists a user and returns it with id, timestamps, and stored fields", async () => {
    const db = await freshDb();

    const user = unwrap(await createUser(db, sample));

    expect(user.email).toBe(sample.email);
    expect(user.username).toBe(sample.username);
    expect(user.passwordHash).toBe(sample.passwordHash);
    expect(user.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  it("returns conflict error with field='email' when email already exists", async () => {
    const db = await freshDb();
    unwrap(await createUser(db, sample));

    const result = await createUser(db, { ...sample, username: "different" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({
        kind: "conflict",
        field: "email",
        constraint: "users_email_unique",
      });
    }
  });

  it("returns conflict error with field='username' when username already exists", async () => {
    const db = await freshDb();
    unwrap(await createUser(db, sample));

    const result = await createUser(db, {
      ...sample,
      email: "different@example.com",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({
        kind: "conflict",
        field: "username",
        constraint: "users_username_unique",
      });
    }
  });
});

describe("findUserByEmail", () => {
  it("returns null when no user has that email", async () => {
    const db = await freshDb();

    const result = unwrap(await findUserByEmail(db, "missing@example.com"));

    expect(result).toBeNull();
  });

  it("returns the user when one exists with the email", async () => {
    const db = await freshDb();
    const created = unwrap(await createUser(db, sample));

    const result = unwrap(await findUserByEmail(db, sample.email));

    expect(result?.id).toBe(created.id);
  });
});

describe("findUserByUsername", () => {
  it("returns the user when one exists with the username", async () => {
    const db = await freshDb();
    const created = unwrap(await createUser(db, sample));

    const result = unwrap(await findUserByUsername(db, sample.username));

    expect(result?.id).toBe(created.id);
  });
});

describe("findUserById", () => {
  it("returns null when no user has the given id", async () => {
    const db = await freshDb();
    const result = unwrap(
      await findUserById(db, "11111111-1111-4111-8111-111111111111"),
    );

    expect(result).toBeNull();
  });

  it("returns the user when one exists with that id", async () => {
    const db = await freshDb();
    const created = unwrap(await createUser(db, sample));

    const result = unwrap(await findUserById(db, created.id));

    expect(result?.email).toBe(sample.email);
  });
});
