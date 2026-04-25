import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/integration/**/*.test.ts"],
    // Sequential + single fork: integration tests share real DB state
    sequence: { concurrent: false },
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    timeout: 30_000,
    hookTimeout: 20_000,
    setupFiles: [
      "tests/integration/env.ts",  // MUST be first — loads .env.local before db module is imported
      "tests/integration/setup.ts",
    ],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
})
