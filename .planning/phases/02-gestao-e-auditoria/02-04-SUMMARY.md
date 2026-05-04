---
phase: 02-gestao-e-auditoria
plan: "04"
subsystem: auth-proxy, onboarding, billing-sync, flows-ux
tags: [cnpj-gate, proxy, onboarding, asaas-sync, flow-runs, ux]
dependency_graph:
  requires: []
  provides:
    - orgCnpjFilled JWT claim
    - proxy CNPJ guard (ORG-02/ORG-03)
    - /onboarding/cadastral mandatory page
    - Asaas customer sync on org-profile PATCH (ORG-04)
    - flows/[id] runs table with etapas+approvals+duration (INFRA-03)
  affects:
    - apps/web/src/proxy.ts
    - apps/web/src/lib/auth.ts
    - apps/web/src/app/(dashboard)/flows/[id]/page.tsx
tech_stack:
  added: []
  patterns:
    - JWT boolean claim derived from DB column at session refresh
    - Edge proxy guard with bypass path set
    - Batch approvals count via inArray(n8nExecutionId) with org scope
    - Payload JSONB extraction for etapas count
    - Asaas PUT sync as non-blocking fire-and-log
key_files:
  created:
    - apps/web/src/app/(auth)/onboarding/cadastral/page.tsx
    - apps/web/tests/integration/flow-runs-ux.test.ts
    - apps/web/tests/e2e/onboarding-cadastral.spec.ts
  modified:
    - apps/web/src/lib/auth.ts
    - apps/web/src/types/next-auth.d.ts
    - apps/web/src/proxy.ts
    - apps/web/src/proxy.test.ts
    - apps/web/src/lib/asaas.ts
    - apps/web/src/lib/asaas.test.ts
    - apps/web/src/app/api/user/org-profile/route.ts
    - apps/web/src/app/(dashboard)/flows/[id]/page.tsx
decisions:
  - "JWT orgCnpjFilled derived server-side in NextAuth jwt callback — client cannot tamper (T-02-01)"
  - "Proxy CNPJ guard placed after emailVerified gate, before admin guard (per RESEARCH Pitfall 6)"
  - "Asaas sync failure logs via console.error but does not fail PATCH response (non-blocking)"
  - "flows/[id] approvals count uses inArray(n8nExecutionId) batch query, never flowRunId"
  - "durationLabel uses DB startedAt/finishedAt columns, not payload timestamps"
metrics:
  duration: "continuation agent — Tasks 3-4 only"
  completed_date: "2026-05-04"
  tasks_completed: 4
  files_changed: 11
---

# Phase 02 Plan 04: Cadastral Onboarding + Flow Runs UX Summary

JWT orgCnpjFilled claim, proxy CNPJ gate, mandatory /onboarding/cadastral page with Asaas sync, and flows/[id] runs table showing etapas + linked approvals + duration.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | JWT orgCnpjFilled field + proxy.ts CNPJ guard + unit tests | `8cdd916` |
| 2 | /onboarding/cadastral page + Asaas sync helper + unit tests | `67605f2` |
| 3 | flows/[id] runs table — etapas + linked approvals + duration | `addd96e` |
| 3b | Integration tests for flow-runs-ux (INFRA-03) | `571b26c` |
| 3c | E2E spec for /onboarding/cadastral CNPJ gate | `c890111` |

## What Was Built

### JWT + Proxy CNPJ Guard (ORG-02/ORG-03)

`auth.ts` JWT callback reads `organizations.cnpj IS NOT NULL` and stores `token.orgCnpjFilled`. Session callback exposes it as `session.user.orgCnpjFilled`.

`proxy.ts` added a new guard block after the emailVerified gate and before the admin guard. The guard redirects authenticated org members (non-superadmin) with `orgCnpjFilled === false` to `/onboarding/cadastral`. Bypass set covers `/onboarding/cadastral`, `/api/auth/*`, `/api/user/org-profile`, and `/api/auth/signout`.

Superadmin users are explicitly exempt (`!session.user.isSuperAdmin` check). The JWT claim is computed server-side by NextAuth — the client cannot tamper with it (T-02-01).

Unit tests (5 cases): redirect on unfilled CNPJ, no redirect when filled, superadmin exempt, cadastral bypass path, org-profile bypass path.

### /onboarding/cadastral Page (ORG-02)

New mandatory client component at `(auth)/onboarding/cadastral/page.tsx`. Reuses `OrgProfileForm` with `theme="dark"` and no `onSkip` prop. On success: calls NextAuth `update()` to force JWT refresh (sets `orgCnpjFilled=true` in new token), then hard-redirects to `/dashboard` via `window.location.href`. Step indicator shows two dots (first = completed org-profile step, second active = cadastral step).

### Asaas Customer Sync (ORG-04)

`updateAsaasCustomer(asaasCustomerId, data)` added to `asaas.ts`. PUTs to `/v3/customers/{id}` with cpfCnpj, phone, address, city, province fields. Returns `{ ok: boolean, error?: string }` — never throws. Wraps fetch in try/catch; returns `ok: false` on any non-2xx or thrown error.

`api/user/org-profile/route.ts` PATCH handler calls `updateAsaasCustomer` after successful DB update when both `asaasCustomerId` and `cnpj` are present. Sync failure is logged via `console.error` but does not fail the HTTP response.

Unit tests (4 cases): correct PUT URL + body, ok:false on fetch throw, ok:false on non-2xx, ok:false on missing API key.

### flows/[id] Runs Table (INFRA-03)

`flows/[id]/page.tsx` refactored from a simple `divide-y` list to a full 5-column table: Data, Status, Etapas, Aprovações, Duração.

`extractEtapas(payload)` counts `Object.keys(payload.executionData.resultData.runData)`. Returns 0 on null/missing path.

`durationLabel(startedAt, finishedAt)` uses DB timestamps. Returns `"—"` when either is null, `"{N}ms"` sub-second, `"{N.N}s"` sub-minute, `"{M}m {S}s"` for longer.

Linked approvals: single batched `inArray(approvals.n8nExecutionId, runExecutionIds)` query with mandatory `eq(approvals.organizationId, orgId)` filter (T-02-02 multi-tenant isolation). Non-zero counts render as accent links to `/approvals?executionId=...`.

Status badges: emerald/success, red/error, amber+animate-pulse/running. Empty state: Activity icon + "Nenhuma execução ainda". Error message row injected below main row when `run.errorMessage` is set.

## Test Coverage

| Suite | File | Tests |
|-------|------|-------|
| Unit | proxy.test.ts | 5 CNPJ guard cases |
| Unit | asaas.test.ts | 4 updateAsaasCustomer cases |
| Integration | flow-runs-ux.test.ts | 4 cases (etapas, linkedApprovals, multi-tenant, durationLabel) |
| E2E | onboarding-cadastral.spec.ts | 4 specs (redirect gate, direct access, no skip, submit→dashboard) |

## Deviations from Plan

None — plan executed exactly as written. All acceptance criteria met.

## Known Stubs

None — all fields are wired to real DB data.

## Threat Flags

No new network endpoints or trust boundaries beyond the plan's threat model. The `inArray(approvals.n8nExecutionId)` query is org-scoped via `eq(approvals.organizationId, orgId)` (T-02-02 mitigation applied).

## Self-Check: PASSED

- `apps/web/src/app/(dashboard)/flows/[id]/page.tsx` — exists, contains `extractEtapas` (x2), `durationLabel` (x2), `inArray(approvals.n8nExecutionId`, `eq(approvals.organizationId`, `Execuções recentes`
- `apps/web/tests/integration/flow-runs-ux.test.ts` — exists
- `apps/web/tests/e2e/onboarding-cadastral.spec.ts` — exists
- Commits `addd96e`, `571b26c`, `c890111` — present in git log
- `npm run build` — exits 0 (verified during Task 3 execution)
