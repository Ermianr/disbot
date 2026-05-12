export * from "./fresh-db";

import type { Result } from "../result";

export function unwrap<T, E>(result: Result<T, E>): T {
  if (!result.ok) {
    throw new Error(
      `Expected Ok, got Err: ${JSON.stringify(result.error)}`,
    );
  }
  return result.value;
}

