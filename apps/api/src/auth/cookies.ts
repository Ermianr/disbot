export const SESSION_COOKIE_NAME = "disbot_session";
export const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type SameSiteOption = "Strict" | "Lax" | "None";

export type CookieOptions = {
  sameSite: SameSiteOption;
  secure: boolean;
};

function buildCookie(
  value: string,
  maxAge: number,
  options: CookieOptions,
): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=${value}`,
    "Path=/",
    "HttpOnly",
    `Max-Age=${maxAge}`,
    `SameSite=${options.sameSite}`,
  ];
  if (options.secure) parts.push("Secure");
  return parts.join("; ");
}

export function buildSetSessionCookie(
  token: string,
  options: CookieOptions,
): string {
  return buildCookie(token, SESSION_COOKIE_MAX_AGE_SECONDS, options);
}

export function buildClearSessionCookie(options: CookieOptions): string {
  return buildCookie("", 0, options);
}

export function parseSessionToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const segment of cookieHeader.split(";")) {
    const [rawName, ...rest] = segment.split("=");
    if (!rawName) continue;
    if (rawName.trim() !== SESSION_COOKIE_NAME) continue;
    return rest.join("=").trim() || null;
  }
  return null;
}
