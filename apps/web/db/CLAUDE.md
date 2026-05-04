# db — Schema e Migrations

## Fluxo de migration (local → produção)

1. Editar `schema.ts`
2. `npx drizzle-kit generate` — gera SQL em `db/migrations/`
3. Revisar SQL gerado antes de commitar
4. Commit + push para `main` → CI aplica via `npm run db:migrate`

**Não rodar `drizzle-kit push` em produção.** `push` não rastreia histórico, pode descartar colunas sem aviso. Produção usa sempre `scripts/migrate.ts`.

**Nunca criar SQL de migration manualmente.** `drizzle-kit generate` é obrigatório — ele escreve o SQL e registra o entry em `db/migrations/meta/_journal.json`. Arquivo SQL sem entry no journal é invisível para `migrate()`: não aplica em produção, sem erro, sem aviso. Foi assim que `0002` e `0003` ficaram fora de prod por semanas. CI tem check automático que bloqueia deploy se journal estiver dessincronizado.

**`when` no journal deve ser cronologicamente crescente.** O migrator usa `ORDER BY created_at DESC LIMIT 1` como high watermark — aplica só migrations com `when > lastMigration.when`. Se `drizzle-kit generate` for rodado com clock errado ou o campo for editado manualmente para um valor menor que a migration anterior, a migration **é silenciosamente pulada** mesmo sem erro. Sempre verificar que `when` da nova entry é maior que a anterior antes de commitar o journal.

## Migrations devem ser idempotentes (obrigatório)

Drizzle não aplica migrations em transação atômica com rollback automático. Se o CI falhar no meio de uma migration e o job for reexecutado, o migrator tenta rodar o arquivo inteiro de novo — mas o banco já tem parte do schema. Resultado: erros `already exists` que travam o deploy.

**Regra:** toda migration gerada por `drizzle-kit generate` deve ser revisada antes do commit e ter as seguintes cláusulas adicionadas manualmente quando necessário:

| Operação | Drizzle gera | Corrigir para |
|---|---|---|
| `CREATE TABLE` | sem `IF NOT EXISTS` | `CREATE TABLE IF NOT EXISTS` |
| `ALTER TABLE ... ADD COLUMN` | sem `IF NOT EXISTS` | `ADD COLUMN IF NOT EXISTS` |
| `ALTER TABLE ... ADD CONSTRAINT` (FK) | sem guarda | `DO $$ BEGIN ALTER TABLE ... ADD CONSTRAINT ...; EXCEPTION WHEN duplicate_object THEN NULL; END $$;` |
| `CREATE INDEX` | sem `IF NOT EXISTS` | `CREATE INDEX IF NOT EXISTS` |

**Sintoma do desastre:** CI falha com `relation "X" already exists` ou `column "X" of relation "Y" already exists`. Causa: run anterior aplicou parte do SQL mas não chegou a registrar a migration em `__drizzle_migrations`.

**Remediação imediata:** adicionar `IF NOT EXISTS` nas statements que já foram aplicadas parcialmente, commitar e repushar. O migrator reexecuta o arquivo, as statements já aplicadas são puladas, as pendentes rodam normalmente.

## Aplicar migration no Docker local

`npm run db:migrate` usa driver Neon HTTP — não funciona com Docker local. Aplicar diretamente:

```bash
sed 's/-->.*//' db/migrations/<arquivo>.sql | docker exec -i pruma_db psql -U pruma -d pruma_dev
```

Isso filtra os marcadores `-->` do Drizzle e passa o SQL puro para o psql.

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