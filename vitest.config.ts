import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts"],
      reporter: ["text-summary"],
      // Floors just below the 2026-11-19 baseline (84.5% statements, 77.0% branches, 85.4% functions, 86.1% lines).
      thresholds: { statements: 84, branches: 76, functions: 85, lines: 85 },
    },
  },
});
