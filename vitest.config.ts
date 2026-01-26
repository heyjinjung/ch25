import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/v2/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "./coverage/v2",
      include: ["src/v2/**/*.{ts,tsx}"],
      exclude: [
        "**/*.d.ts",
        "**/index.ts",
        "**/*.stories.*",
        "**/__mocks__/**",
      ],
    },
    environment: "jsdom",
  },
});
