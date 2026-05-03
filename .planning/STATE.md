# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-02)

**Core value:** Aprovações chegam ao aprovador certo na hora certa — sem notificação, o produto não funciona standalone
**Current focus:** Phase 1 — Foundation

## Current Position

Phase: 1 of 6 (Foundation)
Plan: 3 of 6 in current phase
Status: In progress
Last activity: 2026-05-03 — 01-03-PLAN.md complete (dashboard metrics + onboarding checklist + whatsapp-clicked API)

Progress: [███░░░░░░░] 50%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: ~22 min
- Total execution time: ~1.1 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation | 3/6 | ~66 min | ~22 min |

**Recent Trend:**
- Last 5 plans: 01-01 (~45 min), 01-02 (~8 min), 01-03 (~13 min)
- Trend: fast (TDD kept scope tight; deviation fixes were quick)

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: 6 phases derived from dependency chain; Phase 5 (WhatsApp) gated on Meta WABA external approval
- Roadmap: Phase 6 (SLA) depends on Phase 4 (not Phase 5) — can run in parallel with WhatsApp if needed
- 01-01: emailOtpTokens has no unique index on userId — resend uses delete-then-insert (simpler, prevents stale token reuse)
- 01-01: Upstash Ratelimit singletons at module level with no-op dev fallback when env vars absent
- 01-01: emailVerified boolean defaults to false in session callback for safety (unverified until DB confirms)
- 01-02: sendOtpVerificationEmail/sendOtpResendEmail follow email.ts buildXxx+sendXxx pattern — sendEmail() stays internal per CLAUDE.md mandate
- 01-02: NextAuth v5 update() is the single locked JWT refresh strategy after email verify — no signIn(), no router.refresh()
- 01-02: Playwright spec 3 (happy path) skipped with TODO(Plan 06) — proxy.ts gate needed to make assertion observable
- 01-03: TooltipTrigger.asChild not supported in base-ui v1 — removed, trigger wraps element directly
- 01-03: RESOLVED_STATUSES typed as Array<enum> to satisfy inArray overload (pgEnum strict typing)
- 01-03: SUPPORT_WHATSAPP_LINK needs production value before launch (env var, fallback '#')

### Pending Todos

- **IMEDIATO:** Iniciar registro Meta Business Manager + WABA em paralelo com Phase 1 (lead time 1-4 semanas)
- **Antes Phase 3:** Validar `PUT /subscriptions/{id}` no sandbox Asaas (suporta campo `value`?)
- **Antes Phase 4:** Decidir: Twilio Verify para phone OTP (elimina tabela custom) vs custom tokens

### Blockers/Concerns

- Phase 5 bloqueada por aprovação Meta WABA (externo, iniciar durante Phase 1)
- LGPD debt (CNPJ, endereço, DPO, mailbox, aviso rascunho) deve ser resolvido antes do registro Meta — ver memory project_lgpd_debt.md
- Bug ativo em /api/webhooks/asaas (idempotência + PAYMENT_DELETED) — corrigir em Phase 3

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Security | 2FA TOTP (SEC-01/02/03) | Deferred to v2 | Roadmap init |
| Notifications | Preferências por canal (NOTIF-07) | Deferred to v2 | Roadmap init |
| Infra | Apply migration 0008 to Docker local pruma_dev | **Done** (applied in 01-03) | 01-01 |
| TypeScript | .next/types/validator.ts — missing setup-charge/pay/route.js | Pre-existing, out of scope | 01-01 |

## Session Continuity

Last session: 2026-05-03
Stopped at: 01-03-PLAN.md complete. Wave 2 em andamento — 01-04 pronto para execução.
Resume file: .planning/phases/01-foundation/01-04-PLAN.md
