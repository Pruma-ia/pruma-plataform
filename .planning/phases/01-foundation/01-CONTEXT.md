# Phase 1: Foundation - Context

**Gathered:** 2026-05-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Entrega cadastro seguro com verificação de email obrigatória (OTP), dashboard operacional com 4 métricas reais, onboarding checklist orientado ao cliente (sem exposição do n8n), configuração de nome e logo da org, perfil do usuário e migração do rate limiter de in-memory para Upstash Redis.

Requirements: AUTH-01, AUTH-02, DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, ORG-01, PROF-01, PROF-02, INFRA-01.

</domain>

<decisions>
## Implementation Decisions

### OTP Email Gate (AUTH-01, AUTH-02)

- **D-01:** Gate via `proxy.ts` — checar flag `emailVerified` no JWT. Se `false` → redirect `/verify-email`. Sem acesso parcial ou banner sem bloqueio.
- **D-02:** Pós-registro: usuário cai diretamente em `/verify-email` (não via dashboard + proxy redirect).
- **D-03:** OTP expiry: 15 minutos. Tokens armazenados hashed (bcrypt). Endpoint rate limited.
- **D-04:** OTP errado ou expirado: mostrar erro na UI + botão de reenvio disponível após cooldown de 60s. Sem bloqueio de conta.
- **D-05:** Nenhum usuário real em prod → zero migração necessária. Slate limpo.

### Onboarding Checklist (DASH-03, DASH-04, DASH-05)

- **D-06:** Estado derivado do DB — sem mudança de schema para os itens 2 e 3. Calculado a cada load do dashboard.
- **D-07:** 3 itens do checklist (perspectiva do cliente — n8n é totalmente abstraído, cliente não sabe que existe):
  1. **"Agendar suporte"** → CTA com link WhatsApp do suporte Pruma → auto-marca no click. Requer persistência (ver D-08).
  2. **"Processo configurado"** → `flows.count > 0` (auto-marca quando Pruma configura o n8n e sobe o primeiro fluxo via webhook).
  3. **"Primeira aprovação recebida"** → `approvals.count > 0` (auto-marca quando primeira aprovação chega).
- **D-08:** Item 1 ("Agendar suporte") não pode ser derivado do DB — clicar no WhatsApp link não cria registro. Planner deve decidir: (a) adicionar coluna `onboardingWhatsappClickedAt timestamp` em `organizations` ou (b) outro mecanismo. Recomendação: coluna em organizations (consistente com abordagem DB-first do projeto).
- **D-09:** Mostrado para TODOS os membros da org (sem checar role).
- **D-10:** "Org nova" = `flows.count = 0 AND approvals.count = 0` → checklist visível.
- **D-11:** Checklist desaparece quando os 3 itens estão completos.
- **D-12:** Número de WhatsApp do suporte Pruma deve ser configurável via env var (`SUPPORT_WHATSAPP_LINK`). Planner deve solicitar o número ao usuário ou deixar como pending config.

### Dashboard Métricas (DASH-01, DASH-02)

- **D-13:** 4 cards de métricas no grid existente (`grid-cols-2 sm:grid-cols-4`):
  1. "Fluxos ativos" (já existe)
  2. "Aprovações pendentes" (já existe)
  3. "Resolvidas hoje" (novo)
  4. "Tempo médio (30d)" (novo)
- **D-14:** "Resolvidas hoje" = `status IN ('approved','rejected') AND updatedAt >= início do dia em UTC`.
- **D-15:** "Tempo médio de resolução" = `avg(updatedAt - createdAt)` dos últimos 30 dias, apenas aprovações resolvidas (`status IN ('approved','rejected')`).
- **D-16:** Empty state para tempo médio quando N=0: exibir `"—"` com tooltip "Sem aprovações resolvidas nos últimos 30 dias".

### Org Logo e Nome (ORG-01)

- **D-17:** Logo via upload de arquivo usando R2 presigned URL (mesmo padrão de `approval_files`).
- **D-18:** Formatos aceitos: PNG, JPG, WebP. Tamanho máximo: 2MB. Validação client + server.
- **D-19:** `organizations.logo` (coluna `text`, já existe) armazena o path R2.
- **D-20:** Logo exibida no header do dashboard para todos os membros da org.

### Claude's Discretion

- **PROF-02 (contas conectadas):** View-only — listar quais provedores estão conectados (Google, credentials). Sem disconnect em Phase 1 (exigiria guard para último método de auth — complexidade desnecessária agora).
- **INFRA-01 (Upstash):** Migrar `authRateMap` e `billingRateMap` do `proxy.ts` (hoje `new Map<>`). Adicionar rate limiting Upstash também nos novos endpoints OTP (`/api/auth/verify-otp`, `/api/auth/resend-otp`). Usar conta Upstash real (free tier cobre dev). Variáveis: `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements e Roadmap
- `.planning/REQUIREMENTS.md` — AUTH-01/02, DASH-01-05, ORG-01, PROF-01/02, INFRA-01 com critérios de aceitação
- `.planning/ROADMAP.md` §Phase 1 — Success criteria e dependências

### Pitfalls críticos desta fase
- `.planning/research/PITFALLS.md` §Phase 1 — OTP tokens hasheados, rate limit obrigatório, flag emailVerified no JWT

### Arquitetura e Stack
- `.planning/research/ARCHITECTURE.md` — Schema changes esperados, rotas de API, build order
- `.planning/research/STACK.md` — Decisões de bibliotecas (sem nova dependência para OTP, Upstash para rate limit)

### Convenções do projeto
- `apps/web/CLAUDE.md` — Next.js 16 proxy.ts (não middleware.ts), Neon placeholder, Zod v4
- `apps/web/src/app/CLAUDE.md` — Isolamento multi-tenant, padrões de auth, regras de negócio
- `apps/web/db/CLAUDE.md` — Schema conventions, migration workflow (drizzle-kit generate only)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/web/src/app/(dashboard)/dashboard/page.tsx` — Dashboard já tem `flowStats` + `pendingApprovals` queries + grid-cols-2 sm:grid-cols-4. Estender com 2 métricas novas (resolvidas hoje, tempo médio).
- `apps/web/src/app/api/n8n/approvals/files/presign/route.ts` — Padrão de presigned URL R2. Reusar para upload de logo.
- `apps/web/src/app/(dashboard)/settings/organization/page.tsx` — Página de settings de org existente (CNPJ/endereço). Adicionar campos nome + logo.
- `apps/web/src/components/dashboard/header.tsx` — Ponto de integração para exibir logo da org no header.

### Established Patterns
- Rate limiting via `new Map<>()` em `proxy.ts` — padrão a ser migrado para Upstash (`@upstash/ratelimit`).
- JWT strategy no NextAuth v5 com claims customizados em `src/types/next-auth.d.ts` — adicionar `emailVerified: boolean`.
- R2 presigned URL: `PUT` para upload, path `{orgId}/{uuid}/{filename}` em bucket R2.
- Drizzle ORM queries com isolamento por `organizationId` — toda query nova deve filtrar por org.

### Integration Points
- `apps/web/src/proxy.ts` — adicionar check `emailVerified` após check de subscription existente.
- `apps/web/src/lib/auth.ts` — adicionar `emailVerified` ao JWT callback e ao session callback.
- `apps/web/db/schema.ts` — adicionar `emailVerified timestamp` em `users`, `emailOtpTokens` table nova (hash, expiresAt, userId), e possível `onboardingWhatsappClickedAt` em `organizations`.

</code_context>

<specifics>
## Specific Ideas

- **WhatsApp support link**: o número/link deve ser configurável via env var `SUPPORT_WHATSAPP_LINK`. Planner deve lembrar de pedir o valor ao usuário ou deixar como `process.env.SUPPORT_WHATSAPP_LINK` com fallback para `#`.
- **Item 1 do checklist ("Agendar suporte")**: clicar no CTA abre WhatsApp em nova aba. Imediatamente após o click → chamada a endpoint que seta `onboardingWhatsappClickedAt` em `organizations`. Sem confirmação adicional.
- **Logo no header**: fallback quando `logo` é null = iniciais do nome da org (ex: "Acme Corp" → "AC"). Padrão comum, evita header vazio.

</specifics>

<deferred>
## Deferred Ideas

- **Disconnect de conta conectada (PROF-02)**: remoção de provedor requer guard "último método de auth". Implementar em fase futura se demandado.
- **Preview de logo antes do upload**: crop/resize client-side. Útil mas não necessário para MVP.

</deferred>

---

*Phase: 1-Foundation*
*Context gathered: 2026-05-02*
