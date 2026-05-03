---
phase: 01-foundation
plan: "03"
subsystem: dashboard
tags: [dashboard, metrics, onboarding, multi-tenant, tdd]
dependency_graph:
  requires: [01-01]
  provides: [dashboard-4-cards, onboarding-checklist, whatsapp-clicked-api, dashboard-metrics-lib]
  affects: [apps/web/src/app/(dashboard)/dashboard/page.tsx]
tech_stack:
  added:
    - "@testing-library/react (devDep) — React component unit tests"
    - "@testing-library/dom (devDep) — testing-library peer"
    - "@testing-library/jest-dom (devDep) — jest-dom matchers"
    - "@vitejs/plugin-react@4 (devDep) — vitest JSX transform"
    - "jsdom (devDep) — browser environment for component tests"
    - "shadcn tooltip (src/components/ui/tooltip.tsx) — base-ui based"
  patterns:
    - "AVG(EXTRACT(EPOCH FROM ...)) — Postgres-native avg resolution time"
    - "environmentMatchGlobs jsdom for .tsx — vitest component test setup"
    - "Promise.all server-side — parallel DB queries in Server Component"
key_files:
  created:
    - apps/web/src/lib/dashboard-metrics.ts
    - apps/web/src/lib/dashboard-metrics.test.ts
    - apps/web/src/app/api/onboarding/whatsapp-clicked/route.ts
    - apps/web/src/app/api/onboarding/whatsapp-clicked/route.test.ts
    - apps/web/src/components/dashboard/onboarding-checklist.tsx
    - apps/web/src/components/dashboard/onboarding-checklist.test.tsx
    - apps/web/src/components/ui/tooltip.tsx
    - apps/web/src/test-setup.ts
    - apps/web/tests/integration/onboarding.test.ts
  modified:
    - apps/web/src/app/(dashboard)/dashboard/page.tsx
    - apps/web/vitest.config.ts
decisions:
  - "TooltipTrigger.asChild not supported in base-ui v1 — removed, trigger wraps element directly"
  - "RESOLVED_STATUSES typed as Array<'approved'|'rejected'|'pending'> to satisfy inArray overload"
  - "vitest environmentMatchGlobs used (deprecated warning noted) for .tsx jsdom isolation"
  - "getAvgResolutionMs integration test uses isolated fresh org to guarantee null baseline"
  - "onboarding_whatsapp_clicked_at applied to Docker pruma_db via sed+psql (0008 migration)"
metrics:
  duration: "~13 minutes"
  completed: "2026-05-03"
  tasks: 5
  files_created: 9
  files_modified: 2
  tests_added: 50
  tests_total_after: 465
---

# Phase 1 Plan 03: Dashboard Metrics + Onboarding Checklist Summary

Dashboard estendido com 2 novas métricas reais e checklist de onboarding orientado ao cliente com visibilidade derivada do DB e API de click whatsapp.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | dashboard-metrics lib (TDD) | ca1ad53 / 9288421 | dashboard-metrics.ts + test |
| 2 | POST /api/onboarding/whatsapp-clicked (TDD) | dc2346f / ce533ac | route.ts + route.test.ts |
| 3 | OnboardingChecklist component (TDD) | 35bb9b1 / 0c20814 | onboarding-checklist.tsx + test + tooltip |
| 4 | Dashboard page — 2 cards + checklist | 3bbfdbf | dashboard/page.tsx |
| 5 | Integration tests vs real DB | d5947f6 | onboarding.test.ts |

## Verification Results

- `npx tsc --noEmit`: 0 novos erros (1 pré-existente em `.next/types/validator.ts` fora de escopo)
- `npx vitest run`: 456 testes passando (39 suites)
- `npm run test:int -- onboarding.test.ts`: 9/9 passando contra Docker pruma_db
- Grep gates: `organizationId` aparece 4x em dashboard-metrics.ts (todos os queries org-scoped)
- D-10 literal: `(flowCount === 0 && approvalCount === 0) || !allDone` presente exatamente 1x

## shouldShow Truth Table — D-10 Verification

| flowCount | approvalCount | whatsappClicked | allDone | shouldShow |
|-----------|---------------|-----------------|---------|------------|
| 0 | 0 | false | false | **true** (D-10: fresh org) |
| 0 | 0 | true | false | **true** (fresh + incomplete) |
| 1 | 0 | false | false | **true** (incomplete) |
| 1 | 0 | true | false | **true** (still incomplete) |
| 2 | 5 | false | false | **true** (whatsappClicked gates allDone) |
| 2 | 5 | true | **true** | **false** (D-11: allDone) |

Semântica D-10 preservada: `whatsappClicked` afeta apenas o visual do item 1, não a visibilidade do checklist.

## SUPPORT_WHATSAPP_LINK

Valor lido de `process.env.SUPPORT_WHATSAPP_LINK` com fallback `"#"`. Necessita configuração no Vercel production antes do lançamento — pendente definição do número pelo time Pruma.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] TooltipTrigger.asChild incompatível com base-ui v1**
- **Found during:** Task 4 (tsc)
- **Issue:** `@vitejs/plugin-react` wrapping via `asChild` prop não existe em `TooltipPrimitive.Trigger.Props` do base-ui — o shadcn padrão usa Radix mas o projeto usa base-ui
- **Fix:** Removido `asChild` — `TooltipTrigger` envolve o `<p>` diretamente (mesma semântica visual)
- **Files modified:** `apps/web/src/app/(dashboard)/dashboard/page.tsx`
- **Commit:** 3bbfdbf

**2. [Rule 3 - Blocking] inArray com pgEnum requer tipo exato**
- **Found during:** Task 1 (tsc)
- **Issue:** `RESOLVED_STATUSES as unknown as string[]` não satisfaz o overload de `inArray` para colunas pgEnum
- **Fix:** Tipado como `Array<"approved" | "rejected" | "pending">` — satisfaz overload 2 corretamente
- **Files modified:** `apps/web/src/lib/dashboard-metrics.ts`
- **Commit:** ca1ad53

**3. [Rule 3 - Blocking] @testing-library/react não instalado + vitest sem jsdom**
- **Found during:** Task 3 (RED phase)
- **Issue:** Testes de componentes React precisam de @testing-library/react, @testing-library/dom, jsdom e @vitejs/plugin-react
- **Fix:** Instaladas 5 dependências devDep; vitest.config.ts configurado com `environmentMatchGlobs` + `setupFiles`; `src/test-setup.ts` criado com jest-dom import
- **Files modified:** `apps/web/vitest.config.ts`, `apps/web/src/test-setup.ts`, `apps/web/package.json`
- **Commit:** 0c20814

**4. [Rule 3 - Blocking] Migration 0008 não aplicada no Docker pruma_db**
- **Found during:** Task 5 (integration test — ECONNREFUSED / column not found)
- **Issue:** `onboarding_whatsapp_clicked_at` não existia na tabela `organizations` local
- **Fix:** Aplicado via `sed + docker exec psql` conforme convenção do projeto; colunas já existentes retornaram erro ignorável
- **Commit:** Sem commit separado (infra local)

## Known Stubs

- `process.env.SUPPORT_WHATSAPP_LINK ?? "#"` — fallback `"#"` é intencional para dev/staging. Valor real do WhatsApp de suporte Pruma deve ser configurado no Vercel production antes do launch.

## Threat Flags

Nenhuma nova surface identificada além das mitigações documentadas no plano (T-03-01 a T-03-05).

## Self-Check: PASSED
