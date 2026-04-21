/**
 * Script de baseline — rodar UMA VEZ em bancos criados com drizzle-kit push.
 *
 * O Drizzle migrate usa drizzle.__drizzle_migrations (schema "drizzle", não "public").
 * Este script cria o schema/tabela e marca APENAS 0000 como já aplicada
 * (pois foi criada via drizzle-kit push). Migrations posteriores (0001+)
 * serão aplicadas normalmente pelo CI via migrate.ts.
 *
 * ATENÇÃO: não adicionar aqui migrations que adicionam colunas/índices —
 * marcar como aplicada sem executar o SQL causa erros em produção.
 *
 * Uso: DATABASE_URL=<neon-url> npx tsx scripts/baseline-db.ts
 */
import { neon } from "@neondatabase/serverless"
import "dotenv/config"

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL não definida")

  const sql = neon(url)

  await sql`CREATE SCHEMA IF NOT EXISTS drizzle`

  await sql`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id         SERIAL PRIMARY KEY,
      hash       text   NOT NULL,
      created_at bigint
    )
  `

  await sql`
    INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
    VALUES
      ('0000_dark_mariko_yashida', 1776712068081)
    ON CONFLICT DO NOTHING
  `

  console.log("Baseline concluído. Drizzle migrate pode ser usado a partir de agora.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
