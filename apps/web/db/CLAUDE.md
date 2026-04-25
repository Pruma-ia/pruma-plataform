# db — Schema e Migrations

## Fluxo de migration (local → produção)

1. Editar `schema.ts`
2. `npx drizzle-kit generate` — gera SQL em `db/migrations/`
3. Revisar SQL gerado antes de commitar
4. Commit + push para `main` → CI aplica via `npm run db:migrate`

**Não rodar `drizzle-kit push` em produção.** `push` não rastreia histórico, pode descartar colunas sem aviso. Produção usa sempre `scripts/migrate.ts`.

## Setup único — bancos criados com drizzle-kit push (já existentes)

Drizzle Migrate usa `__drizzle_migrations` pra rastrear aplicadas. Bancos criados com `push` não têm essa tabela. Antes do primeiro deploy com CI, rodar:

```bash
DATABASE_URL=<neon-url> npm run db:baseline
```

Cria tabela de controle, marca `0000` e `0001` como aplicadas — sem recriar nada.
**Rodar apenas uma vez.** Depois, `npm run db:migrate` funciona normalmente.

## Scripts disponíveis

| Script | Quando usar |
|---|---|
| `npm run db:generate` | Após editar `schema.ts` — gera SQL |
| `npm run db:migrate` | Aplica migrations pendentes (local ou produção) |
| `npm run db:baseline` | **Uma vez** em bancos legados criados com `push` |
| `npm run db:studio` | UI local pra inspecionar banco |
| `npm run db:push` | **Apenas local** pra iteração rápida de schema |

## Variáveis de ambiente para drizzle-kit

`drizzle-kit` lê `.env`, **não** `.env.local`. `apps/web/.env` deve existir localmente com `DATABASE_URL` pra `db:push`, `db:generate`, `db:studio` e `db:migrate` funcionarem sem passar variável manualmente. Arquivo no `.gitignore` (`*.env*`) — não versionar.

## Convenções de schema

- Todo recurso de negócio tem `organizationId` com FK pra `organizations` — sem exceção.
- IDs são `text` com `crypto.randomUUID()` como default (não serial/integer).
- Timestamps: `created_at` e `updated_at` com `defaultNow()`.
- Enums como `pgEnum` no topo do arquivo, antes das tabelas que os usam.

## Tabelas de aprovações ricas

`approvals` tem duas colunas JSON adicionais:
- `decision_fields jsonb` — definido pelo n8n ao criar: `[{id, type:"select", label, options:[{id,label}]}]`
- `decision_values jsonb` — preenchido pelo aprovador: `{fieldId: optionId}`

`approval_files` — arquivos anexados a aprovações (armazenados no R2):
- `r2_key` = path no bucket: `{orgId}/{uuid}/{filename}` — construído pelo Pruma, nunca pelo caller.
- `organization_id` presente para queries multi-tenant e cascade delete.
- Sem coluna `updated_at` — arquivos são imutáveis após upload.

`approval_file_uploads` — controle de uploads pendentes (presigned URL):
- Status `"pending"` → `"confirmed"`. Pendentes expirados removidos por cron diário.
- Evita arquivos órfãos no R2 se n8n chama presign mas nunca cria a aprovação.