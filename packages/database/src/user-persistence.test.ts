import { describe, expect, it } from "vitest";
import { freshDb } from "./test-utils/fresh-db";
import {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByUsername,
  UserConflictError,
} from "./user-persistence";

const sample = {
  email: "alice@example.com",
  username: "alice",
  passwordHash: "hash",
};

describe("createUser", () => {
  it("persists a user and returns it with id, timestamps, and stored fields", async () => {
    const db = await freshDb();

    const user = await createUser(db, sample);

    expect(user.email).toBe(sample.email);
    expect(user.username).toBe(sample.username);
    expect(user.passwordHash).toBe(sample.passwordHash);
    expect(user.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  it("throws UserConflictError with field='email' when email already exists", async () => {
    const db = await freshDb();
    await createUser(db, sample);

    await expect(
      createUser(db, { ...sample, username: "different" }),
    ).rejects.toMatchObject({
      name: "UserConflictError",
      field: "email",
    });
  });

  it("throws UserConflictError with field='username' when username already exists", async () => {
    const db = await freshDb();
    await createUser(db, sample);

    await expect(
      createUser(db, { ...sample, email: "different@example.com" }),
    ).rejects.toMatchObject({
      name: "UserConflictError",
      field: "username",
    });
  });

  it("UserConflictError is the error subclass exported by the module", async () => {
    const db = await freshDb();
    await createUser(db, sample);

    await expect(
      createUser(db, { ...sample, username: "different" }),
    ).rejects.toBeInstanceOf(UserConflictError);
  });
});

describe("findUserByEmail", () => {
  it("returns null when no user has that email", async () => {
    const db = await freshDb();

    expect(await findUserByEmail(db, "missing@example.com")).toBeNull();
  });

  it("returns the user when one exists with the email", async () => {
    const db = await freshDb();
    const created = await createUser(db, sample);

    const result = await findUserByEmail(db, sample.email);

    expect(result?.id).toBe(created.id);
  });
});

describe("findUserByUsername", () => {
  it("returns the user when one exists with the username", async () => {
    const db = await freshDb();
    const created = await createUser(db, sample);

    const result = await findUserByUsername(db, sample.username);

    expect(result?.id).toBe(created.id);
  });
});

describe("findUserById", () => {
  it("returns null when no user has the given id", async () => {
    const db = await freshDb();
    expect(
      await findUserById(db, "11111111-1111-4111-8111-111111111111"),
    ).toBeNull();
  });

  it("returns the user when one exists with that id", async () => {
    const db = await freshDb();
    const created = await createUser(db, sample);

    const result = await findUserById(db, created.id);

    expect(result?.email).toBe(sample.email);
  });
});
