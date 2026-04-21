# db — Schema e Migrations

## Fluxo de migration (local → produção)

1. Editar `schema.ts`
2. `npx drizzle-kit generate` — gera o SQL em `db/migrations/`
3. Revisar o SQL gerado antes de commitar
4. Commit + push para `main` → CI aplica automaticamente via `npm run db:migrate`

**Não rodar `drizzle-kit push` em produção.** O `push` não rastreia histórico e pode
descartar colunas sem aviso. Em produção usa-se sempre `scripts/migrate.ts`.

## Setup único — bancos criados com drizzle-kit push (já existentes)

O Drizzle Migrate usa a tabela `__drizzle_migrations` no banco para saber o que já foi aplicado.
Bancos criados com `push` não têm essa tabela. Antes do primeiro deploy com CI, rodar:

```bash
DATABASE_URL=<neon-url> npm run db:baseline
```

Isso cria a tabela de controle e marca `0000` e `0001` como já aplicadas — sem recriar nada.
**Rodar apenas uma vez.** Após isso, `npm run db:migrate` funciona normalmente.

## Scripts disponíveis

| Script | Quando usar |
|---|---|
| `npm run db:generate` | Após editar `schema.ts` — gera o arquivo SQL |
| `npm run db:migrate` | Aplica migrations pendentes (local ou produção) |
| `npm run db:baseline` | **Uma vez** em bancos legados criados com `push` |
| `npm run db:studio` | UI local para inspecionar o banco |
| `npm run db:push` | **Apenas local** para iteração rápida de schema |

## Convenções de schema

- Todo recurso de negócio tem coluna `organizationId` com FK para `organizations` — sem exceção.
- IDs são `text` com `crypto.randomUUID()` como default (não serial/integer).
- Timestamps: `created_at` e `updated_at` com `defaultNow()`.
- Enums definidos como `pgEnum` no topo do arquivo antes das tabelas que os usam.
