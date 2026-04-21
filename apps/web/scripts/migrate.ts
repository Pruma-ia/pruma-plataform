import { drizzle } from "drizzle-orm/neon-http"
import { migrate } from "drizzle-orm/neon-http/migrator"
import { neon } from "@neondatabase/serverless"
import "dotenv/config"

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL não definida")

  const sql = neon(url)
  const db = drizzle(sql)

  console.log("Aplicando migrations Drizzle...")
  await migrate(db, { migrationsFolder: "./db/migrations" })
  console.log("Migrations concluídas.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
