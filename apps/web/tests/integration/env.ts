// First setupFile — loads .env.local BEFORE any module is evaluated.
// Import order matters: this file must be listed first in vitest.integration.config.ts setupFiles.
import { config } from "dotenv"
import path from "path"

config({ path: path.resolve(process.cwd(), ".env.local") })

// Fixed secret used across all integration tests
process.env.N8N_WEBHOOK_SECRET = "int-test-secret-pruma"
