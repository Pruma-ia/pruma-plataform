---
phase: 02-gestao-e-auditoria
verified: 2026-05-04T18:00:00Z
status: human_needed
score: 13/13 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open /approvals in browser — confirm status pills, search bar, date filters, flow filter, pagination footer all render correctly with real data"
    expected: "Filter controls visible, table shows approval rows scoped to org, pagination shows 'Mostrando X–Y de Z aprovações', Exportar CSV button present"
    why_human: "Server-side rendering with URL-driven filters cannot be exercised without a running dev server; requires visual + interaction validation"
  - test: "With CNPJ-less org account, navigate to /dashboard — confirm redirect to /onboarding/cadastral; fill all 8 fields and submit; confirm redirect to /dashboard without loop"
    expected: "Proxy guard fires on /dashboard; cadastral form shows dark theme, step dots, no skip button; after submit JWT refreshes and /dashboard loads without looping"
    why_human: "Proxy redirect behavior, NextAuth JWT refresh cycle, and full onboarding form submit flow require an active session in a browser"
  - test: "Open any /approvals/[id] detail page — confirm 'Histórico de decisão' section is visible with at least one event; reload page; confirm 'Aprovação visualizada' event appears in timeline"
    expected: "Timeline section renders with ol/li event rows, Lucide icons, PT-BR labels, actor names, timestamps; approval_viewed event appears after reload"
    why_human: "Fire-and-forget void insert timing and visual timeline rendering require live page load to verify"
  - test: "Open /flows/[id] with existing flow runs — confirm 'Execuções recentes' table renders 5 columns: Data, Status, Etapas, Aprovações, Duração"
    expected: "Table shows real etapas count from payload, linked approval count as accent link (or —), duration label from DB timestamps, correct status badge colors (emerald/red/amber)"
    why_human: "etapas JSONB extraction and multi-column table rendering require visual verification against real flow run data"
---

# Phase 02: Gestão e Auditoria Verification Report

**Phase Goal:** Approval events audit trail, approval list with filters/search/export, approval timeline detail, CNPJ cadastral onboarding, proxy guard, flows UX enhancements
**Verified:** 2026-05-04T18:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | approval_events table exists with FK cascade to approvals | VERIFIED | `db/migrations/0009_approval_events.sql`: `CREATE TABLE IF NOT EXISTS`, `DO $$ BEGIN ... ADD CONSTRAINT ... EXCEPTION WHEN duplicate_object`, `CREATE INDEX IF NOT EXISTS`; `schema.ts` exports `approvalEvents` at line 259, `approvalEventsRelations` at line 388 |
| 2 | approval_created event inserted by POST /api/n8n/approvals | VERIFIED | `src/app/api/n8n/approvals/route.ts` line 149: `db.insert(approvalEvents).values({ eventType: "approval_created", actorType: "system", actorId: null })` after approval INSERT |
| 3 | approval_resolved event inserted by approve/reject routes with metadata | VERIFIED | `approve/route.ts` line 63, `reject/route.ts` line 63 — both insert `approval_resolved` with `{ status, comment, decisionValues }` metadata; `actorId` set from `session.user.id` server-side |
| 4 | User filters /approvals by status, flowId, dateFrom, dateTo via URL search params | VERIFIED | `page.tsx`: `searchParams: Promise<Record<string, string>>`, `const sp = await searchParams`, conditions array with `eq(approvals.status)`, `eq(approvals.flowId)`, `gte`/`lte` with `!isNaN(d.getTime())` date guard |
| 5 | User searches approvals by free text via debounced input updating ?q= | VERIFIED | `approvals-search-bar.tsx`: `"use client"`, `setTimeout(..., 300)`, `useSearchParams()` + `new URLSearchParams(searchParams.toString())` preserving params, resets `page` to `"1"` on q change |
| 6 | User paginates results 50 per page via ?page= URL param | VERIFIED | `page.tsx`: `PAGE_SIZE = 50`, LIMIT/OFFSET, parallel `count(*)::int` total query; `approvals-table.tsx`: "Mostrando X–Y de Z aprovações" footer, `pointer-events-none opacity-50` at boundaries |
| 7 | User exports filtered approvals as CSV via GET /api/approvals/export | VERIFIED | `export/route.ts`: `await auth()` → 401 guard, mirrors page.tsx conditions with no LIMIT, `Content-Disposition: attachment; filename="aprovacoes-{ts}.csv"`, `csvEscape` + `csvSafe` injection-safe helpers |
| 8 | Approval detail page shows ordered timeline of approval_events | VERIFIED | `approvals/[id]/page.tsx` lines 59–62: `.from(approvalEvents).leftJoin(users, ...).where(eq(approvalEvents.approvalId, id)).orderBy(asc(approvalEvents.createdAt))`; `approval-timeline.tsx`: `EVENT_LABEL` map, `<ol>/<li>`, Lucide icons per event type |
| 9 | Opening approval detail page inserts approval_viewed event (fire-and-forget) | VERIFIED | `page.tsx` line 65: `void db.insert(approvalEvents).values({ eventType: "approval_viewed", actorType: "user", actorId: session!.user.id })` — non-blocking, actorId from server session only |
| 10 | JWT carries orgCnpjFilled boolean derived from organizations.cnpj IS NOT NULL | VERIFIED | `auth.ts` lines 101, 129, 151: `token.orgCnpjFilled = !!membership.cnpj`; session callback propagates it; `next-auth.d.ts` lines 15 + 30 declare `orgCnpjFilled?: boolean` in both Session and JWT |
| 11 | proxy.ts redirects authenticated org users without CNPJ to /onboarding/cadastral | VERIFIED | `proxy.ts` lines 125–148: CNPJ guard placed AFTER emailVerified gate (line 108) and BEFORE admin guard (line 150); `!session.user.isSuperAdmin` exemption; bypass set covers `/onboarding/cadastral`, `/api/auth/*`, `/api/user/org-profile` |
| 12 | After successful cadastral submit, Asaas customer updated via PUT /v3/customers/{id}; failure non-blocking | VERIFIED | `asaas.ts` line 30: `fetch(\`${ASAAS_API_URL}/customers/${asaasCustomerId}\`, { method: "PUT" })`; `ASAAS_API_URL` defaults to `https://sandbox.asaas.com/api/v3`; returns `{ ok: false }` on any error, never throws; `org-profile/route.ts` line 90: `console.error` on failure but response continues |
| 13 | /flows/[id] runs section displays etapas count, linked approvals count, duration | VERIFIED | `flows/[id]/page.tsx`: `extractEtapas(payload)` (line 13), `durationLabel(startedAt, finishedAt)` (line 21), `inArray(approvals.n8nExecutionId, runExecutionIds)` (line 100) with mandatory `eq(approvals.organizationId, orgId)`; no `flowRunId` references |

**Score:** 13/13 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/web/db/schema.ts` | approvalEvents pgTable + approvalEventsRelations | VERIFIED | `export const approvalEvents` at line 259; `approvalEventsRelations` at line 388 |
| `apps/web/db/migrations/0009_approval_events.sql` | Idempotent migration | VERIFIED | `CREATE TABLE IF NOT EXISTS`, `DO $$ EXCEPTION WHEN duplicate_object`, `CREATE INDEX IF NOT EXISTS` |
| `apps/web/tests/integration/approvals-events.test.ts` | Integration tests for 3 call sites | VERIFIED | 7 event-type assertions covering approval_created, approval_resolved (x2), cross-tenant isolation |
| `apps/web/src/app/(dashboard)/approvals/page.tsx` | Server Component with searchParams Promise | VERIFIED | `searchParams: Promise<Record<string, string>>`, `await searchParams`, conditions array with orgId mandatory first |
| `apps/web/src/app/(dashboard)/approvals/approvals-search-bar.tsx` | Client component with 300ms debounce | VERIFIED | `"use client"`, `setTimeout(..., 300)`, `useSearchParams()` param preservation |
| `apps/web/src/app/(dashboard)/approvals/approvals-table.tsx` | Server table, no useState | VERIFIED | No `useState` import; pagination footer; STATUS_ICON/STATUS_BADGE copied from deleted file |
| `apps/web/src/app/api/approvals/export/route.ts` | CSV export with Content-Disposition | VERIFIED | `Content-Disposition` header, `csvEscape` + `csvSafe`, org-scoped query |
| `apps/web/src/app/(dashboard)/approvals/[id]/approval-timeline.tsx` | Server Component with icons + PT-BR labels | VERIFIED | No `"use client"`; `EVENT_LABEL`: "Aprovação criada", "Aprovação visualizada", "Aprovado", "Rejeitado"; `<ol>/<li>` |
| `apps/web/src/app/(dashboard)/approvals/[id]/page.tsx` | Modified with eventRows query + void insert | VERIFIED | `from(approvalEvents)`, `asc(approvalEvents.createdAt)`, `void db.insert` with `approval_viewed` |
| `apps/web/src/proxy.ts` | CNPJ guard with /onboarding/cadastral redirect | VERIFIED | Guard block lines 125–148, correct ordering relative to emailVerified and admin guards |
| `apps/web/src/lib/auth.ts` | JWT callback with orgCnpjFilled | VERIFIED | `token.orgCnpjFilled = !!membership.cnpj` at 3 jwt trigger points |
| `apps/web/src/app/(auth)/onboarding/cadastral/page.tsx` | Mandatory cadastral page, no onSkip | VERIFIED | `theme="dark"`, `await update()`, zero occurrences of `onSkip` |
| `apps/web/src/lib/asaas.ts` | updateAsaasCustomer helper | VERIFIED | `export async function updateAsaasCustomer`, PUT to `${ASAAS_API_URL}/customers/${id}`, `{ ok: boolean }` return type, try/catch |
| `apps/web/src/app/(dashboard)/flows/[id]/page.tsx` | Runs table with extractEtapas + durationLabel | VERIFIED | Both functions defined and used (2 occurrences each); `inArray` + org scope; no `flowRunId` |
| `apps/web/src/app/(dashboard)/approvals/approvals-list.tsx` | DELETED (replaced by approvals-table.tsx) | VERIFIED | File does not exist; zero import references in page.tsx |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `api/n8n/approvals/route.ts` | approval_events table | `db.insert(approvalEvents)` | WIRED | Line 149, eventType="approval_created", actorType="system", actorId=null |
| `api/approvals/[id]/approve/route.ts` | approval_events table | `db.insert(approvalEvents)` | WIRED | Line 63, eventType="approval_resolved", actorId=session.user.id |
| `api/approvals/[id]/reject/route.ts` | approval_events table | `db.insert(approvalEvents)` | WIRED | Line 63, same pattern as approve with status="rejected" in metadata |
| `approvals/page.tsx` | approvals table | `and(eq(approvals.organizationId, orgId), ...conditions)` | WIRED | Mandatory orgId first; ILIKE, date range, flowId, status all applied conditionally |
| `approvals-search-bar.tsx` | URL search params | `router.push` with `setTimeout(300)` | WIRED | Debounced push preserving existing params, resets page to "1" |
| `export/route.ts` | approvals table | Drizzle select scoped by orgId | WIRED | `eq(approvals.organizationId, orgId)` first in conditions; no LIMIT |
| `approvals/[id]/page.tsx` | approval_events table | `.from(approvalEvents)` WHERE approvalId | WIRED | Lines 59–62, LEFT JOIN users, ORDER BY createdAt ASC |
| `approvals/[id]/page.tsx` | approval_events insert | `void db.insert(...)` | WIRED | Line 65, non-blocking, actorId from session only |
| `proxy.ts` | session.user.orgCnpjFilled | JWT claim at edge | WIRED | `session.user.orgCnpjFilled === false` at line 144 |
| `onboarding/cadastral/page.tsx` | `api/user/org-profile/route.ts` | OrgProfileForm PATCH on submit | WIRED | OrgProfileForm reused with `theme="dark"` and `onSuccess` calling `update()` + hard redirect |
| `api/user/org-profile/route.ts` | Asaas customers API | `updateAsaasCustomer(org.asaasCustomerId, ...)` | WIRED | Lines 80–90; conditional on `asaasCustomerId && cnpj` both present |
| `flows/[id]/page.tsx` | approvals table | `inArray(approvals.n8nExecutionId, runExecutionIds)` | WIRED | Lines 99–100 with mandatory `eq(approvals.organizationId, orgId)` for multi-tenant isolation |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `approvals/page.tsx` | `rows` (approval list) | Drizzle select from `approvals` with org-scoped WHERE conditions | Yes — `Promise.all` parallel query, no hardcoded values | FLOWING |
| `export/route.ts` | CSV body rows | Drizzle select with LEFT JOINs to users + flows, no LIMIT | Yes — mirrors page.tsx conditions against real DB | FLOWING |
| `approval-timeline.tsx` | `events` prop | Drizzle select from `approval_events` LEFT JOIN users, passed from page.tsx | Yes — real DB query; component is pure renderer of prop data | FLOWING |
| `flows/[id]/page.tsx` | `linkedMap` | `count(*) FROM approvals WHERE inArray(n8nExecutionId)` grouped by executionId | Yes — batch query against real approvals table | FLOWING |
| `auth.ts` jwt callback | `orgCnpjFilled` token field | `organizations.cnpj` DB column — `!!membership.cnpj` | Yes — re-read at every jwt trigger including forced `update()` call | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED — all phase 2 behaviors require a running dev server with an active authenticated session. Integration test suites cover data-layer logic programmatically (approvals-events.test.ts, approvals-filters.test.ts, approval-timeline.test.ts, flow-runs-ux.test.ts). Playwright E2E specs exist for UI flows but are skipped when no session is available.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| APPROV-05 | 02-01, 02-03 | Audit trail — who decided, when, comment, decision values | SATISFIED | approval_events table; 3 call sites instrumented (approval_created, approval_resolved x2, approval_viewed); timeline component renders ordered events with icons and PT-BR labels |
| APPROV-01 | 02-02 | Filter approvals by status | SATISFIED | `eq(approvals.status, sp.status)` in conditions array; status pills as `<a href>` links |
| APPROV-02 | 02-02 | Filter by flow and date range | SATISFIED | `eq(approvals.flowId)`, `gte`/`lte` with date validation |
| APPROV-03 | 02-02 | Free text search | SATISFIED | `ilike(approvals.title, \`%${sp.q}%\`)` with 300ms debounce client input |
| APPROV-04 | 02-02 | CSV export | SATISFIED | `GET /api/approvals/export` with Content-Disposition, RFC 4180 csvEscape, formula-safe csvSafe |
| ORG-02 | 02-04 | Owner can edit cadastral data: CNPJ, address, phone | SATISFIED | `/onboarding/cadastral` page + OrgProfileForm; existing `/settings/organization` also exposes form |
| ORG-03 | 02-04 | Cadastral data collected in onboarding | SATISFIED | Proxy guard redirects to `/onboarding/cadastral`; mandatory step (no onSkip) |
| ORG-04 | 02-04 | Cadastral data pre-fills Asaas billing fields | SATISFIED | `updateAsaasCustomer` called on PATCH success; non-blocking on failure via console.error |
| INFRA-03 | 02-04 | Flow runs module refactor | SATISFIED | `extractEtapas`, `durationLabel`, batch `inArray(n8nExecutionId)` query, 5-column table with status badges |

### Anti-Patterns Found

No anti-patterns found. Scan across all 14 phase 2 modified/created files returned zero matches for TODO/FIXME/PLACEHOLDER/placeholder/not implemented/coming soon. No stub `return null`/`return {}`/`return []` patterns in data-rendering paths. `approvals-list.tsx` correctly deleted with zero remaining import sites.

Minor type note (non-blocking): `next-auth.d.ts` declares `orgCnpjFilled?: boolean` (optional) rather than the plan-specified `orgCnpjFilled: boolean` (required). Runtime behavior is identical because auth.ts always sets the field and proxy.ts uses strict `=== false` comparison, which correctly handles both `false` and `undefined`.

### Human Verification Required

#### 1. Approvals Filter/Search/Pagination/Export UI

**Test:** Log in to a test org with existing approvals. Navigate to `/approvals`. Click a status pill; type in search bar and wait 300ms; use date filters and submit; paginate to page 2; click "Exportar CSV".
**Expected:** URL updates to `?status=`, `?q=`, `?dateFrom=`/`?dateTo=` params; table rows match filter; pagination footer shows correct count; CSV download starts with `aprovacoes-*.csv` filename.
**Why human:** URL-driven filter behavior, pagination rendering, and download trigger require a live browser session against a running server.

#### 2. CNPJ Cadastral Gate Flow

**Test:** Create or use a test org without CNPJ filled. Attempt to navigate to `/dashboard`.
**Expected:** Automatically redirected to `/onboarding/cadastral`. Page shows dark theme OrgProfileForm with two step indicator dots and no "Pular" button. Fill all 8 cadastral fields and submit. Redirected to `/dashboard` without looping back to `/onboarding/cadastral`.
**Why human:** Proxy redirect logic, NextAuth `update()` JWT refresh cycle, and full onboarding flow require a live authenticated session.

#### 3. Approval Timeline UI

**Test:** Open any approval detail page at `/approvals/{id}`. Scroll to timeline section.
**Expected:** "Histórico de decisão" card visible with at least one event row showing icon, label ("Aprovação criada" or similar), actor name or "Sistema", and timestamp in pt-BR format. Reload page — "Aprovação visualizada" event appears.
**Why human:** Fire-and-forget insert timing and visual timeline layout require live page interaction.

#### 4. Flows Runs Table

**Test:** Open a flow detail page at `/flows/{id}` that has existing run records with payload data.
**Expected:** "Execuções recentes" table with 5 columns: Data, Status, Etapas, Aprovações, Duração. Etapas shows integer count from payload. Duration shows "Xs" / "Xm Ys" / "—". Status badges show emerald (success), red (error), amber+pulse (running).
**Why human:** JSONB payload extraction (etapas count) and status badge rendering require real run data in a running application.

---

_Verified: 2026-05-04T18:00:00Z_
_Verifier: Claude (gsd-verifier)_
