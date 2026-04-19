import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import * as schema from "../../db/schema"

// Fallback para build time (neon não conecta até a primeira query)
const sql = neon(process.env.DATABASE_URL ?? "postgresql://user:pass@localhost/placeholder")
export const db = drizzle(sql, { schema })
