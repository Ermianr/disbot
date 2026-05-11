import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    exclude: ["node_modules", "dist"],
    setupFiles: ["./test/setup-bun-shim.ts"],
    testTimeout: 10000,
  },
});
