import { describe, expect, it } from "vitest";
import { classify, defaultAdapter } from "./error-adapter";

describe("classify", () => {
  it("maps unique violation code 23505 to conflict with field and constraint", () => {
    const error = Object.assign(new Error("unique violation"), {
      code: "23505",
      constraint: "users_email_unique",
    });

    const result = classify(error);

    expect(result).toEqual({
      kind: "conflict",
      field: "email",
      constraint: "users_email_unique",
    });
  });

  it("maps unique violation with unknown constraint to conflict with field 'unknown'", () => {
    const error = Object.assign(new Error("unique violation"), {
      code: "23505",
      constraint: "bots_name_unique",
    });

    const result = classify(error);

    expect(result).toEqual({
      kind: "conflict",
      field: "unknown",
      constraint: "bots_name_unique",
    });
  });

  it("unwraps nested causes to find the postgres error", () => {
    const inner = Object.assign(new Error("inner"), {
      code: "23505",
      constraint: "users_username_unique",
    });
    const outer = new Error("outer", { cause: inner });

    const result = classify(outer);

    expect(result).toEqual({
      kind: "conflict",
      field: "username",
      constraint: "users_username_unique",
    });
  });

  it("maps foreign key violation code 23503 to constraintFailed", () => {
    const error = Object.assign(new Error("fk violation"), {
      code: "23503",
      message: "insert or update on table violates foreign key constraint",
    });

    const result = classify(error);

    expect(result).toEqual({
      kind: "constraintFailed",
      message: "insert or update on table violates foreign key constraint",
    });
  });

  it("maps connection error code 08006 to connectionFailed", () => {
    const error = Object.assign(new Error("connection failed"), {
      code: "08006",
      message: "Connection refused",
    });

    const result = classify(error);

    expect(result).toEqual({
      kind: "connectionFailed",
      message: "Connection refused",
    });
  });

  it("maps PostgresError with Connection message to connectionFailed", () => {
    const error = Object.assign(new Error("pg error"), {
      name: "PostgresError",
      message: "Connection terminated unexpectedly",
    });

    const result = classify(error);

    expect(result).toEqual({
      kind: "connectionFailed",
      message: "Connection terminated unexpectedly",
    });
  });

  it("maps unknown errors to unexpected", () => {
    const error = new Error("something went wrong");

    const result = classify(error);

    expect(result).toEqual({
      kind: "unexpected",
      message: "something went wrong",
    });
  });

  it("maps non-error values to unexpected", () => {
    const result = classify("string error");

    expect(result).toEqual({
      kind: "unexpected",
      message: "string error",
    });
  });
});

describe("defaultAdapter.adapt", () => {
  it("returns ok when the operation succeeds", async () => {
    const result = await defaultAdapter.adapt(async () => 42);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(42);
    }
  });

  it("returns err with classified DbError when the operation throws", async () => {
    const error = Object.assign(new Error("unique violation"), {
      code: "23505",
      constraint: "users_email_unique",
    });

    const result = await defaultAdapter.adapt(async () => {
      throw error;
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({
        kind: "conflict",
        field: "email",
        constraint: "users_email_unique",
      });
    }
  });
});
