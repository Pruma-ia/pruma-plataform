---
phase: 01-foundation
plan: 06
subsystem: auth
tags: [upstash, ratelimit, proxy, middleware, emailVerified, nextauth, playwright, vitest]

# Dependency graph
requires:
  - phase: 01-01
    provides: "Upstash ratelimit singletons (authRatelimit, billingRatelimit) + emailVerified JWT claim"
  - phase: 01-02
    provides: "/verify-email page + /api/auth/verify-otp + /api/auth/resend-otp routes"
provides:
  - "proxy.ts usando Upstash (authRatelimit + billingRatelimit) no lugar do Map in-memory — INFRA-01 fechado"
  - "Gate emailVerified em proxy.ts: usuário autenticado com emailVerified=false é redirecionado para /verify-email — D-01 fechado"
  - "Bypass set de rotas acessíveis sem verificação (verify-email, verify-otp, resend-otp, signout)"
  - "config.matcher expandido para incluir /verify-email e endpoints OTP"
  - "Suite de testes unitários (vitest, 12 casos) + spec Playwright (6 specs) cobrindo o gate"
affects: [02-gestao-auditoria, phase-2]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "emailVerified gate em proxy.ts: session.user.emailVerified === false + bypass set + precedência após onboarding guard"
    - "Upstash ratelimit via .limit(ip) assíncrono substituindo Map in-memory — compatível com multi-instância Vercel"
    - "isEmailVerifyBypass() helper: Set de paths exatos + wildcard /api/auth/* (exceto /api/auth/onboarding)"

key-files:
  created:
    - apps/web/src/proxy.test.ts
    - apps/web/tests/e2e/email-verification-gate.spec.ts
  modified:
    - apps/web/src/proxy.ts

key-decisions:
  - "emailVerified gate posicionado APÓS onboarding guard — usuário sem org vê /onboarding antes de /verify-email (org é pré-requisito para verificar)"
  - "Upstash fail-open: @upstash/ratelimit retorna success:true em falha de Redis — app fica de pé durante outage Upstash, rate limiting temporariamente ineficaz"
  - "isEmailVerifyBypass inclui /api/auth/* (wildcard) além do bypass set explícito — evita lockout em qualquer endpoint NextAuth"
  - "Usuário verificado em /verify-email é redirecionado para /dashboard (evita página orfã)"

patterns-established:
  - "Gate order em proxy.ts: rate-limit → onboarding → emailVerified → admin → subscription"
  - "Bypass sets tipados como Set<string> para lookup O(1) em middleware de hot path"

requirements-completed: [INFRA-01, AUTH-01]

# Metrics
duration: 20min
completed: 2026-05-02
---

# Phase 1 Plan 06: Proxy Email Gate + Upstash Migration Summary

**proxy.ts migrado para Upstash ratelimiters (INFRA-01) e gate emailVerified adicionado (AUTH-01/D-01): usuário autenticado sem verificação de email é bloqueado em guarded routes e redirecionado para /verify-email**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-05-02
- **Completed:** 2026-05-02
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Map in-memory (`authRateMap`, `billingRateMap`, `isRateLimited`) removido integralmente; substituído por `await authRatelimit.limit(ip)` e `await billingRatelimit.limit(ip)` do módulo Plan 01 — INFRA-01 fechado
- Gate `emailVerified === false` adicionado em proxy.ts após onboarding guard: usuário autenticado com org mas sem email verificado é redirecionado para `/verify-email`; bypass set protege as rotas necessárias para completar o fluxo
- Suite vitest com 12 casos cobrindo rate-limit, gate, bypass set, precedência onboarding guard, superadmin exempt e config.matcher; spec Playwright com 6 specs cobrindo fluxo completo unverified→verified→dashboard

## Task Commits

1. **Task 1 RED: testes unitários proxy.ts (vitest, falha esperada)** - `66ae1d0` (test)
2. **Task 1 GREEN: proxy.ts migrado para Upstash + gate emailVerified** - `148f0c1` (feat)
3. **Task 2: Playwright spec email-verification-gate** - `d79f8c4` (feat)

## Files Created/Modified

- `apps/web/src/proxy.ts` — Map in-memory removido; Upstash ratelimiters; emailVerified gate; bypass set; matcher expandido
- `apps/web/src/proxy.test.ts` — 12 casos vitest: rate-limit 429, gate redirect, bypass set (verify-email, verify-otp, resend-otp, signout), superadmin exempt, onboarding precedence, config.matcher contents
- `apps/web/tests/e2e/email-verification-gate.spec.ts` — 6 specs Playwright: unverified→redirect, /verify-email acessível, OTP endpoints acessíveis, unverified→verify→dashboard, verified bounced de /verify-email, sem sessão não causa loop

## Decisions Made

- **emailVerified gate após onboarding guard:** usuário sem org deve ver `/onboarding` primeiro (é pré-requisito para ter organizationId, que por sua vez é pré-requisito do gate). Documentado em comentário no código.
- **Upstash fail-open:** `@upstash/ratelimit` retorna `success: true` em falha de Redis (comportamento da lib). Durante outage Upstash, rate limiting fica ineficaz mas o app permanece operacional. Risco aceito (T-06-08).
- **`isEmailVerifyBypass` inclui `/api/auth/*` wildcard** além do Set explícito: qualquer endpoint NextAuth (signin, callback, csrf, session) é acessível enquanto não verificado — evita lockout inesperado durante fluxos OAuth enquanto mantém o gate restritivo para rotas da aplicação.
- **Usuário verificado em `/verify-email` é redirecionado para `/dashboard`:** evita página orfã para usuário que volta à URL diretamente após verificar.

## Deviations from Plan

None — plano executado exatamente como especificado.

## Issues Encountered

None.

## User Setup Required

None — sem configuração externa adicional. Upstash já configurado em Plan 01.

Nota: Upstash dev fallback (no-op quando `UPSTASH_REDIS_REST_URL` está vazio) herdado do módulo `lib/ratelimit.ts` (Plan 01). Em ambiente local sem variáveis Upstash, proxy.ts funciona sem rate limiting — comportamento esperado para dev.

## Next Phase Readiness

Phase 1 — Foundation completa:
- Todos os 6 planos da Wave 1/2/3 executados e commitados
- INFRA-01 (Upstash), AUTH-01 (emailVerified gate), DASH-01/02/03/04/05 (dashboard), ORG-01 (org identity), PROF-01/02 (user profile) fechados
- Pronto para iniciar Phase 2: Gestão e Auditoria

---
*Phase: 01-foundation*
*Completed: 2026-05-02*
