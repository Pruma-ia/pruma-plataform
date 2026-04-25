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
- `selectCallCount` pattern quando uma rota faz múltiplos `SELECT` sequenciais — mock retorna resposta diferente por chamada.

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

## Identidade Visual

Pruma IA colors (use by semantic name, never invent variants):
- Azul Marinho `#0D1B4B` — dark backgrounds, highlight text
- Ciano Elétrico `#00AEEF` — primary actions, positive status
- Ciano Pálido `#E0F6FE` — badge/chip backgrounds
- **Errors always red** — never replace with brand color (semantics)
- Fonts: Barlow (headings) + Inter (body)