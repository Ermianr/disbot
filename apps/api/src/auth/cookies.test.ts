import { describe, expect, it } from "vitest";
import {
  buildClearSessionCookie,
  buildSetSessionCookie,
  parseSessionToken,
  SESSION_COOKIE_NAME,
} from "./cookies";

const baseOpts = { sameSite: "Lax" as const, secure: false };

describe("buildSetSessionCookie", () => {
  it("emits the disbot_session cookie with HttpOnly, Path=/, Max-Age=604800, SameSite=Lax", () => {
    const header = buildSetSessionCookie("the-token", baseOpts);

    expect(header).toContain(`${SESSION_COOKIE_NAME}=the-token`);
    expect(header).toContain("HttpOnly");
    expect(header).toContain("Path=/");
    expect(header).toContain("Max-Age=604800");
    expect(header).toContain("SameSite=Lax");
    expect(header).not.toContain("Secure");
  });

  it("includes Secure when options.secure is true", () => {
    const header = buildSetSessionCookie("the-token", {
      sameSite: "None",
      secure: true,
    });

    expect(header).toContain("Secure");
    expect(header).toContain("SameSite=None");
  });
});

describe("buildClearSessionCookie", () => {
  it("emits a cookie with Max-Age=0 (browser deletes immediately)", () => {
    const header = buildClearSessionCookie(baseOpts);

    expect(header).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(header).toContain("Max-Age=0");
    expect(header).toContain("HttpOnly");
    expect(header).toContain("Path=/");
  });
});

describe("parseSessionToken", () => {
  it("returns the token value when disbot_session is present", () => {
    expect(parseSessionToken("disbot_session=abc; other=1")).toBe("abc");
    expect(parseSessionToken("other=1; disbot_session=xyz")).toBe("xyz");
  });

  it("returns null when the header is missing or has no disbot_session entry", () => {
    expect(parseSessionToken(null)).toBeNull();
    expect(parseSessionToken("")).toBeNull();
    expect(parseSessionToken("other=1")).toBeNull();
  });
});
