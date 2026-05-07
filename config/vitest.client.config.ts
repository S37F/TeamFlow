import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["client/**/*.test.{ts,tsx}"],
    setupFiles: ["./tests/setup.client.ts"],
    testTimeout: 10000,
    css: false,
    coverage: {
      provider: "v8",
      include: ["client/src/**/*.{ts,tsx}"],
      exclude: ["**/*.test.{ts,tsx}", "client/src/components/ui/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "..", "client", "src"),
      "@shared": path.resolve(__dirname, "..", "shared"),
    },
  },
});
