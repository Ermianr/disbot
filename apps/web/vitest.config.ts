import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "jsdom",
    exclude: ["node_modules", "dist"],
  },
});
