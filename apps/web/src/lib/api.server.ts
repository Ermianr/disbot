import { getRequestHeader } from "@tanstack/react-start/server";
import type { ApiOptions } from "./api";

export function forwardCookie(): ApiOptions {
  const cookie = getRequestHeader("cookie");
  return cookie ? { cookie } : {};
}
