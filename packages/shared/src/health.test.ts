import { describe, expect, it } from "vitest";
import { HealthResponse } from "./health";

describe("HealthResponse schema", () => {
  it("accepts a valid health response", () => {
    const result = HealthResponse.safeParse({ status: "ok" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid health response", () => {
    const result = HealthResponse.safeParse({ status: "down" });
    expect(result.success).toBe(false);
  });
});
