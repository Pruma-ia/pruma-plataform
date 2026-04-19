import * as schema from "../../db/schema"
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres"
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import { Pool } from "pg"

const url = process.env.DATABASE_URL ?? "postgresql://user:pass@localhost/placeholder"

const isLocal = url.includes("localhost") || url.includes("127.0.0.1")

export const db = isLocal
  ? drizzlePg(new Pool({ connectionString: url }), { schema })
  : drizzleNeon(neon(url), { schema })
