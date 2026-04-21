# db — Schema e Migrations

## Processo de migration

1. Editar `schema.ts`
2. `npx drizzle-kit generate` — gera o SQL em `db/migrations/`
3. `DATABASE_URL=... npx drizzle-kit migrate` — aplica ao banco

**Para banco já existente com tabelas criadas:** se a migration for de coluna nova em tabela existente,
rodar `ALTER TABLE` direto via `docker exec pruma_db psql ...` é mais seguro que tentar aplicar
a migration completa (que tentaria recriar tabelas e falharia).

**Neon em produção:** `drizzle-kit push` com `DATABASE_URL` apontando para Neon aplica o schema diretamente.
Região do banco: `AWS US East 1 (N. Virginia)` — deve coincidir com a região das funções Vercel para minimizar latência.

## Convenções de schema

- Todo recurso de negócio tem coluna `organizationId` com FK para `organizations` — sem exceção.
- IDs são `text` com `crypto.randomUUID()` como default (não serial/integer).
- Timestamps: `created_at` e `updated_at` com `defaultNow()`.
- Enums definidos como `pgEnum` no topo do arquivo antes das tabelas que os usam.
