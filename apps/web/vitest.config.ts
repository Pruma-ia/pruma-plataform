import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    exclude: ["tests/integration/**", "tests/e2e/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/types/**",
        "src/**/*.d.ts",
        // Infrastructure files — NextAuth config, DB client init, proxy middleware,
        // email SDK wrapper — cannot be meaningfully unit tested; covered by integration tests
        "src/proxy.ts",
        "src/lib/auth.ts",
        "src/lib/db.ts",
        "src/lib/email.ts",
        "src/lib/password-rules.ts",
        "src/app/api/auth/\\[...nextauth\\]/route.ts",
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
