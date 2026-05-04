---
phase: 02-gestao-e-auditoria
plan: "02"
subsystem: approvals-ui
tags: [approvals, filters, search, pagination, csv-export, server-components, drizzle, multi-tenant]
dependency_graph:
  requires: [02-01]
  provides: [APPROV-01, APPROV-02, APPROV-03, APPROV-04]
  affects: [approvals-page, export-route]
tech_stack:
  added: []
  patterns:
    - URL-driven Server Component filters (searchParams: Promise<>)
    - Drizzle AND condition array for composable WHERE clauses
    - Client debounce search bar with router.push preserving params
    - RFC 4180 CSV serialization with injection-safe helpers
key_files:
  created:
    - apps/web/src/app/(dashboard)/approvals/approvals-search-bar.tsx
    - apps/web/src/app/(dashboard)/approvals/approvals-table.tsx
    - apps/web/src/app/api/approvals/export/route.ts
    - apps/web/src/app/api/approvals/export/route.test.ts
    - apps/web/tests/integration/approvals-filters.test.ts
    - apps/web/tests/e2e/approvals.spec.ts
  modified:
    - apps/web/src/app/(dashboard)/approvals/page.tsx
  deleted:
    - apps/web/src/app/(dashboard)/approvals/approvals-list.tsx
decisions:
  - "Status pills render as <a href> links for URL navigation — no client state"
  - "Status pill counts use unfiltered org totals so pills act as global navigation tabs"
  - "Flow/date filters submitted via native <form method=get> with noscript fallback"
  - "JSX.Element return type removed — Next.js 16 App Router infers Server Component return type"
  - "Export CSV link placed in both toolbar and table footer for discoverability"
metrics:
  duration: "~35 minutes"
  completed: "2026-05-04"
  tasks_completed: 2
  files_changed: 7
---

# Phase 02 Plan 02: Approvals Filter/Search/Export Summary

URL-driven Server Component approvals page with Drizzle server-side filters for status/flowId/dateFrom/dateTo/q, 300ms debounced client search bar, 50-per-page pagination via URL params, and org-scoped CSV export route with RFC 4180 escaping and formula-injection prevention.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Failing integration tests for filters/search/CSV | 97993d8 | approvals-filters.test.ts |
| 1 (GREEN) | Refactor /approvals page + search bar + table + E2E spec | e03c317 | page.tsx, approvals-search-bar.tsx, approvals-table.tsx, approvals.spec.ts; deleted approvals-list.tsx |
| 2 | CSV export route + unit tests | b8940b4 | route.ts, route.test.ts |

## What Was Built

### page.tsx (refactored)

Converted from a `"use client"` component with `useState` filtering to a Next.js 16 Server Component:

- `searchParams: Promise<Record<string, string>>` signature with `const sp = await searchParams` (Pitfall 1 from RESEARCH)
- Conditions array always starts with `eq(approvals.organizationId, orgId)` — orgId mandatory first
- `Promise.all` for 5 parallel Drizzle queries: rows + count + org flows + file counts + status pill counts
- Date validation via `!isNaN(d.getTime())` before pushing `gte`/`lte` conditions
- ILIKE for free text: `ilike(approvals.title, \`%${sp.q}%\`)`
- Status pills rendered as `<a href>` links — server navigation, no client state
- Flow/date filters in a native `<form method="get">` with `<noscript>` submit button for progressive enhancement

### approvals-search-bar.tsx (new)

`"use client"` component — the only interactive piece:
- 300ms `setTimeout` debounce via `useRef<ReturnType<typeof setTimeout>>`
- `useSearchParams()` + `new URLSearchParams(searchParams.toString())` preserves existing params
- Resets `page` to `"1"` on q change so user lands on page 1 of new results
- `aria-label="Buscar aprovações"`, `autoComplete="off"`, Lucide `Search` icon positioned at `pl-9`

### approvals-table.tsx (new — replaces approvals-list.tsx)

Pure server component, zero `useState`:
- STATUS_ICON / STATUS_BADGE / STATUS_LABEL copied verbatim from deleted `approvals-list.tsx`
- New "Fluxo" column: `hidden md:table-cell text-xs text-muted-foreground` between Título and Data
- Pagination footer: "Mostrando X–Y de Z aprovações" + Anterior/Próxima `<a>` links with `aria-label`
- `pointer-events-none opacity-50` disables pagination links at boundaries
- Two empty states: filtered-empty (Search icon + "Nenhum resultado") vs no-approvals-yet (ClipboardList icon)
- Export CSV `<a href="/api/approvals/export?{params}" download>` in table footer

### GET /api/approvals/export (new)

- `await auth()` → 401 if no `session?.user?.organizationId` (T-02-03b — before any DB call)
- Mirrors page.tsx condition-building, NO LIMIT — full export
- `csvEscape(v)`: wraps in `"`, doubles internal `"` (RFC 4180)
- `csvSafe(v)`: prefixes `=+-@` starting characters with a space (T-02-03c formula injection)
- `Content-Type: text/csv; charset=utf-8` + `Content-Disposition: attachment; filename="aprovacoes-{ts}.csv"`
- LEFT JOINs `users` (resolvedByName) and `flows` (flowName) — 7 CSV columns: ID, Título, Status, Fluxo, Data, Resolvido Por, Comentário

### approvals-list.tsx (deleted)

Old `"use client"` component with `useState<Filter>` and in-memory array filtering. Replaced entirely by `approvals-table.tsx`. No import sites remained before deletion.

## Test Coverage

### Integration — approvals-filters.test.ts (8 tests, all green)

- APPROV-01: `status=approved` filter — only approved rows returned, pending/rejected excluded
- APPROV-02a: `flowId` filter — only approvals with that flowId appear
- APPROV-02b: `dateFrom` filter — rows before cutoff date excluded
- APPROV-03: `q=Pagamento` ILIKE — only title-matching row returned
- T-02-02: cross-tenant isolation — other org's approval absent from all results
- APPROV-04: 401 when unauthenticated
- APPROV-04: `Content-Type: text/csv` + `Content-Disposition: attachment` headers present
- APPROV-04: CSV header row contains expected column names

### Unit — route.test.ts (9 tests, all green)

- 401 when no session
- 401 when session has no organizationId
- 200 with correct Content-Type and Content-Disposition
- CSV header row column names
- Comma in title → wrapped in double-quotes
- Double-quote in title → doubled (RFC 4180)
- Formula injection on title (`=SUM(A1:A10)` → `" =SUM(A1:A10)"`)
- Formula injection on comment (`+cmd|...` → `" +cmd|..."`)
- Drizzle `.where()` called — proves orgId scoping applied

### E2E — approvals.spec.ts (3 tests, skip-guarded)

- Status pill click → `?status=pending` in URL
- Search debounce → `?q=contrato` in URL after 300ms
- Exportar CSV → `waitForEvent("download")` confirms `aprovacoes-*.csv` download

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `JSX.Element` return type unavailable in Next.js 16 App Router**
- **Found during:** Build verification (Task 1)
- **Issue:** `Promise<JSX.Element>` caused `Cannot find namespace 'JSX'` TypeScript error — Next.js 16 App Router infers Server Component return types automatically; explicit `JSX.Element` annotation is not valid without importing React namespace
- **Fix:** Removed explicit return type from `ApprovalsPage` function signature
- **Files modified:** `apps/web/src/app/(dashboard)/approvals/page.tsx`

### Design Decisions Made During Implementation

**Status pill counts:** Pills show total unfiltered org counts (via a separate `groupBy` query) rather than counts of the currently-filtered subset. This preserves the UX behavior of the old `useState` component where pills showed global totals and acted as navigation tabs, not sub-filters of sub-filters.

**Export in two locations:** The "Exportar CSV" link appears both in the page toolbar (line 2, per UI-SPEC §1) and in the table footer. The table footer placement was added for discoverability — users scanning the table don't need to scroll back up to find it.

**No Playwright auth fixture:** `approvals.spec.ts` uses a `skipIfUnauthenticated` guard (same pattern as existing specs). Tests run against a dev server with an active session and skip gracefully when redirected to login.

## Threat Surface Scan

No new threat surface beyond the plan's threat model. All registered threats mitigated:

| Threat ID | Mitigation Implemented |
|-----------|----------------------|
| T-02-02 | `eq(approvals.organizationId, orgId)` always first in conditions array; integration test T-02-02 asserts cross-tenant rows absent |
| T-02-03 | Export route re-applies same orgId condition first; unit test asserts `.where()` called |
| T-02-03b | `await auth()` → 401 before any DB call; unit + integration tests verify 401 |
| T-02-03c | `csvSafe()` prefixes `=+-@`; `csvEscape()` doubles quotes; unit tests cover both |
| T-02-03d | No LIMIT — accepted for MVP; documented |

## Known Stubs

None. All data wired from real Drizzle queries. No placeholder values flow to the UI.

## Self-Check: PASSED

- FOUND: approvals-search-bar.tsx
- FOUND: approvals-table.tsx
- FOUND: export/route.ts
- FOUND: export/route.test.ts
- FOUND: approvals-filters.test.ts
- FOUND: approvals.spec.ts
- CONFIRMED DELETED: approvals-list.tsx
- FOUND: commit 97993d8 (RED test)
- FOUND: commit e03c317 (Task 1 GREEN)
- FOUND: commit b8940b4 (Task 2)
