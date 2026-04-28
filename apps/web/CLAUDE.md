<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

Breaking changes — APIs, conventions, file structure may differ from training data. Read relevant guide in `node_modules/next/dist/docs/` before writing code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# apps/web — Stack e Decisões Arquiteturais

## Next.js 16 — Breaking Changes

### proxy.ts (não middleware.ts)
Route interception uses `src/proxy.ts`. Export as `default` or named `proxy`.
`middleware.ts` not recognized this version.

### Neon DB — placeholder obrigatório no build
`neon()` validates URL on module import. Next.js runs this at build.
Always use: `process.env.DATABASE_URL ?? "postgresql://user:pass@localhost/placeholder"`

### Zod v4
`z.record()` requires two args: `z.record(z.string(), z.unknown())`.
One arg = type error.

---

## Processo de desenvolvimento

### Fluxo completo — nova feature até prod

```bash
# 1. Branch
git checkout -b feat/nome master

# 2. Infra local
docker compose up -d                   # postgres + minio

# 3. Migration (se houver — db:migrate usa Neon HTTP, não funciona com Docker)
sed 's/-->.*//' db/migrations/<arquivo>.sql | docker exec -i pruma_db psql -U pruma -d pruma_dev

# 4. Dev
cd apps/web && npm run dev

# 5. Copiloto visual — mantém dados no DB para validar no browser
npm run test:int:keep                  # abre URLs impressas no terminal no browser

# 6. Testes completos
npm test                               # unit
npm run test:int                       # integration, limpa dados ao final

# 7. Build local (obrigatório antes de commitar)
npm run build

# 8. Review
# /review-cycle no Claude Code — inclui SECURITY, QA, CODE, INFRA READINESS

# 9. PR + merge
gh pr create ...
gh pr ready N && gh pr merge N --merge --delete-branch

# 10. Acompanhar deploy
gh run watch $(gh run list --limit 1 --json databaseId -q '.[0].databaseId')
```

### Diagnóstico de bugs — regra

**Diagnosticar via CLI antes de assumir causa.** Nunca supor sem evidência.

```bash
# R2/MinIO: verificar endpoint, health, arquivo no bucket
curl http://localhost:9000/minio/health/live
curl -I "$(npx tsx -e "...")"          # testar presigned URL diretamente
```

### Email — transporte dev vs prod

`src/lib/email.ts` usa dois transportes:
- **Produção** (`NODE_ENV=production`): Resend — `RESEND_API_KEY` e `RESEND_FROM` no Vercel.
- **Dev**: nodemailer → Mailpit SMTP em `localhost:1025`. UI em `http://localhost:8025`.

**Por que Mailpit em vez de guard por env var:** Resend não tem sandbox/environments nativos. Qualquer guard por env var cria risco de vazamento se a var for esquecida. Mailpit captura 100% dos emails sem chegar a destinatários reais, independente de configuração.

`SMTP_HOST` e `SMTP_PORT` são dev-only — **não setar no Vercel**. Em prod o branch `NODE_ENV=production` usa Resend e ignora essas vars.

```bash
docker compose up -d mailpit   # sobe junto com postgres + minio
# UI: http://localhost:8025
```

**Footgun:** `_transporter` é singleton em `email.ts`. Mudar `SMTP_HOST`/`SMTP_PORT` em `.env.local` exige restart do servidor Next.js.

### Footguns conhecidos

**`objectExists` engole exceções** — se `R2_ENDPOINT` estiver errado, retorna `false` em vez de erro. UI mostra "Não foi possível carregar o arquivo" sem indicar a causa real. Checar endpoint primeiro.

**Singleton R2 client** — `_client` é cached no módulo. Mudar `R2_ENDPOINT` em `.env.local` exige restart do servidor Next.js.

**`R2_ENDPOINT` local vs externo** — `localhost:9000` funciona para dev normal. Quando n8n é externo e precisa fazer PUT direto no MinIO, usar URL pública (ngrok/cloudflare tunnel) — mas isso quebra leitura do browser se o túnel expirar. Usar R2 real em produção; MinIO só local.

### Build antes de commitar (obrigatório)
Run `npm run build` in `apps/web` before any commit.
TypeScript/type errors only surface at build — Vercel fails if not verified locally.

### Testes — obrigatório a cada nova feature/rota

**Regra**: toda nova rota de API ou lógica de negócio exige:
1. **Testes unitários** (`src/**/*.test.ts`) — mocks de DB, auth, serviços externos; sem infra real.
2. **Testes de integração** (`tests/integration/`) — banco real (Docker `pruma_db`), só mocka auth session + S3 presign + `global.fetch` de callback.

Isso substitui curl manual. Nunca shipar feature sem rodar as duas suites.

**Comandos**:
```bash
npm test                  # unit — sem infra (CI)
npm run test:int          # integration — roda e limpa DB ao final
npm run test:int:keep     # integration — KEEP_DATA=1: mantém dados no DB para validar no frontend
```

**Modo copiloto (`test:int:keep`)**:
Dados persistem após os testes. Terminal imprime URLs diretas (`http://localhost:3000/approvals/{id}`) em cada step chave. Rodar `npm run dev` em paralelo → abrir URLs no browser → validar visual. Limpar depois com `npm run test:int` (sem KEEP_DATA).

**Convenções de testes unitários**:
- `vi.hoisted(() => vi.fn())` para mocks que precisam estar disponíveis antes da factory do `vi.mock` (ex: `mockAuth`).
- Mock de `db` via `vi.mock("@/lib/db", ...)` — retorna objetos chainable (`.select().from().where()`).
- `selectCallCount` pattern quando uma rota faz múltiplos `SELECT` sequenciais — usar `mockResolvedValueOnce` encadeado.
- Mocks com estado mutável entre testes (ex: `validateCallbackUrl` virado `false` pelo teste SSRF) — usar `vi.hoisted(() => vi.fn())` + resetar no `beforeEach`.

**Convenções de testes de integração**:
- `tests/integration/env.ts` carregado primeiro no `setupFiles` → seta `DATABASE_URL` e `N8N_WEBHOOK_SECRET` antes de qualquer import.
- `tests/integration/state.ts` — ctx compartilhado entre setup e testes (orgId, userId, n8nSlug).
- `tests/integration/setup.ts` — `beforeAll` cria org + user únicos por run (`test-int-{Date.now()}`); `afterAll` deleta org (cascade limpa tudo).
- `callbackUrl` usa `.test` TLD (ex: `https://n8n.callback.test/webhook`) — passa `validateCallbackUrl` sem mock.
- `pool: "forks"` + `singleFork: true` + `sequence: { concurrent: false }` — testes sequenciais no mesmo processo para evitar conflito de estado no DB.

**Quando Docker não roda migration** (`scripts/migrate.ts` usa driver Neon HTTP):
```bash
sed 's/-->.*//' db/migrations/<arquivo>.sql | docker exec -i pruma_db psql -U pruma -d pruma_dev
```

---

## Stack

- Next.js 16.2.4, App Router, TypeScript, Turbopack
- NextAuth v5 — JWT strategy, DrizzleAdapter, Google + Credentials
- Drizzle ORM + PostgreSQL (Neon prod, Docker local `pruma_db`)
- Tailwind CSS v4 with `@theme inline` and oklch, shadcn/ui
- Asaas for BR payments (PIX/boleto)

---

## Autenticação

- JWT carries `organizationId`, `role`, `subscriptionStatus` via join on `organizationMembers`.
- Superadmin (`isSuperAdmin: true`) returns without `organizationId` — accesses orgs by URL.
- `session.user` typed in `src/types/next-auth.d.ts`.

---

## Convenções de Formulários

Todo formulário deve seguir estas regras — sem exceção:

- **`htmlFor` + `id`**: cada `<label>` tem `htmlFor` apontando para o `id` do input correspondente. Screen readers dependem disso.
- **`autoComplete`**: todo input de auth/dados pessoais declara o valor semântico correto:
  - `name`, `email`, `organization`, `new-password`, `current-password`, `tel`, etc.
  - Sem `autoComplete`, gerenciadores de senha e autofill do browser não funcionam.
- **`role="alert"`**: mensagens de erro dinâmicas (state que aparece após ação do usuário) sempre com `role="alert"` — garante anúncio por leitores de tela.
- **`aria-describedby`**: quando há texto auxiliar condicional (ex: lista de requisitos de senha), o input referencia o `id` desse bloco via `aria-describedby`. Só setar quando o bloco está visível.

**Rationale:** Descoberto na revisão de `(auth)/register` e `(auth)/login` — nenhum input tinha `htmlFor`/`id`, erros não eram anunciados, autofill quebrado. Acessibilidade e UX básica, custo zero.

---

## Identidade Visual

Pruma IA colors (use by semantic name, never invent variants):
- Azul Marinho `#0D1B4B` — dark backgrounds, highlight text
- Ciano Elétrico `#00AEEF` — primary actions, positive status
- Ciano Pálido `#E0F6FE` — badge/chip backgrounds
- **Errors always red** — never replace with brand color (semantics)
- Fonts: Barlow (headings) + Inter (body)