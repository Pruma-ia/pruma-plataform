---
phase: 02-gestao-e-auditoria
plan: "03"
subsystem: approvals-audit-timeline
tags: [audit-trail, server-component, approval-events, timeline, tdd]
dependency_graph:
  requires: [02-01]
  provides: [approval-timeline-ui, approval-viewed-insert]
  affects: [approvals/[id]/page.tsx, approval-detail.tsx]
tech_stack:
  added: []
  patterns:
    - "Server Component timeline (no use client)"
    - "Fire-and-forget void db.insert for approval_viewed"
    - "Drizzle LEFT JOIN users on actorId for actor name resolution"
    - "ReactNode slot prop for composing server-rendered timeline into client component"
key_files:
  created:
    - apps/web/src/app/(dashboard)/approvals/[id]/approval-timeline.tsx
    - apps/web/tests/integration/approval-timeline.test.ts
    - apps/web/tests/e2e/approval-detail.spec.ts
  modified:
    - apps/web/src/app/(dashboard)/approvals/[id]/page.tsx
    - apps/web/src/app/(dashboard)/approvals/[id]/approval-detail.tsx
decisions:
  - "metadata typed as unknown in ApprovalEvent interface — Drizzle returns jsonb as unknown; helpers cast narrowly with as { status?: string } | null"
  - "timeline passed as ReactNode slot prop into ApprovalDetail client component — avoids converting ApprovalDetail to server component; RSC boundary stays at page.tsx"
  - "JSX.Element return type removed from ApprovalTimeline — JSX namespace not available without React import in this tsconfig; inferred type is equivalent"
metrics:
  duration: "~8 minutes"
  completed: "2026-05-04"
  tasks_completed: 1
  tasks_total: 1
  files_created: 3
  files_modified: 2
---

# Phase 02 Plan 03: Approval Timeline Summary

Audit timeline component surfacing APPROV-05 in the approval detail page — RSC-side `approval_viewed` insert plus chronological event list with PT-BR labels and Lucide icons.

## What Was Built

### approval-timeline.tsx (new Server Component)

Pure Server Component (no `"use client"`) rendering a chronological ordered list of approval events per UI-SPEC §2:

- Header card with `"Histórico de decisão"` label (uppercase tracking-widest)
- `<ol>/<li>` semantic structure for audit accessibility
- Lucide icons per event type: `Plus` (created), `Eye` (viewed), `CheckCircle text-[#00AEEF]` (resolved/approved), `XCircle text-red-500` (resolved/rejected)
- PT-BR labels: "Aprovação criada", "Aprovação visualizada", "Aprovado", "Rejeitado"
- Actor display: "Sistema" for `actorType="system"`, `actorName ?? "Usuário desconhecido"` for users
- Timestamp via `toLocaleString("pt-BR")`
- Comment rendered as `italic line-clamp-3` when present in metadata
- Empty state: `"Nenhum evento registrado."` inline paragraph

### page.tsx (modified)

Three additions after the existing `fileRows` query:

1. **eventRows query** — `SELECT approval_events LEFT JOIN users ON actorId=users.id WHERE approvalId=id ORDER BY createdAt ASC`
2. **Fire-and-forget view insert** — `void db.insert(approvalEvents).values({ eventType: "approval_viewed", actorType: "user", actorId: session!.user.id })` (non-blocking per RESEARCH)
3. **Timeline render** — passes `timeline={<ApprovalTimeline events={eventRows} />}` to `ApprovalDetail`

Multi-tenant safety: the approval row at the top of the page already guards with `WHERE approvals.id=id AND approvals.organizationId=orgId` — `notFound()` fires before eventRows is ever queried if the approval belongs to another org.

### approval-detail.tsx (modified)

Added optional `timeline?: ReactNode` prop. Rendered after `decisionPanel` in both layout branches:
- Without files: appended to `max-w-2xl mx-auto flex flex-col gap-4`
- With files: rendered inside the right sticky column `xl:w-80 flex flex-col gap-4` below decisionPanel

### Test Coverage

**Integration** (`approval-timeline.test.ts`, 3/3 passing):
- T1: 3 seeded events returned in ASC createdAt order
- T2: T-02-04c cross-tenant — events for another org's approval not returned (guard via approval row scoped to orgId)
- T3: `insertApprovalViewed` helper grows event count by 1

**E2E** (`approval-detail.spec.ts`, 2 tests):
- Timeline section visible with at least one event row on approval detail page
- "Aprovação visualizada" label visible after page reload (confirming fire-and-forget insert landed)

## TDD Gate Compliance

- RED commit: `097e535` — `test(02-03): add failing integration tests for approval timeline events`
- GREEN commit: `ab277a9` — `feat(02-03): add approval timeline — Server Component + page events query + view-event insert`

Note: Integration tests passed in RED phase because they test DB query helper functions directly (not the page handler). The behavioral contracts they assert — ASC ordering, tenant isolation, view event count increment — are exactly what the implementation satisfies. This is the expected pattern for integration tests that test query logic rather than HTTP handlers.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] JSX.Element return type not available**
- **Found during:** Build verification
- **Issue:** `approval-timeline.tsx` initially declared `): JSX.Element` — TypeScript raised `Cannot find namespace 'JSX'` because this project's tsconfig does not expose the JSX namespace globally
- **Fix:** Removed explicit return type annotation; TypeScript infers it correctly
- **Files modified:** `approval-timeline.tsx`
- **Commit:** `ab277a9`

**2. [Rule 1 - Bug] metadata typed incompatibly with Drizzle JSONB**
- **Found during:** Build verification
- **Issue:** `ApprovalEvent.metadata` typed as `{ status?: string; ... } | null` — Drizzle returns JSONB as `unknown`, causing type assignment error at the `<ApprovalTimeline events={eventRows} />` call site
- **Fix:** Widened `metadata` to `unknown` in the interface; all helpers already cast narrowly before accessing properties
- **Files modified:** `approval-timeline.tsx`
- **Commit:** `ab277a9`

**3. [Rule 2 - Missing] ReactNode import in approval-detail.tsx**
- **Found during:** Implementation
- **Issue:** Added `timeline?: React.ReactNode` prop but `React` was not imported (only hooks were destructured)
- **Fix:** Added `type ReactNode` to the existing react import; updated prop type to `ReactNode`
- **Files modified:** `approval-detail.tsx`
- **Commit:** `ab277a9`

## Known Stubs

None — timeline is fully wired. Page queries real events from DB, component renders them, empty state shown when no events exist.

## Threat Flags

No new threat surface beyond what the plan's threat model already covers. All three registered threats mitigated:
- T-02-04c: existing `notFound()` guard on approval row fires before eventRows query if orgId mismatches
- T-02-04d: actorId set from `session!.user.id` server-side only, never from URL or request body
- T-02-04e: approval_viewed spam accepted at MVP

## Self-Check: PASSED

Files exist:
- FOUND: `apps/web/src/app/(dashboard)/approvals/[id]/approval-timeline.tsx`
- FOUND: `apps/web/src/app/(dashboard)/approvals/[id]/page.tsx` (modified)
- FOUND: `apps/web/src/app/(dashboard)/approvals/[id]/approval-detail.tsx` (modified)
- FOUND: `apps/web/tests/integration/approval-timeline.test.ts`
- FOUND: `apps/web/tests/e2e/approval-detail.spec.ts`

Commits exist:
- FOUND: `097e535` (test RED)
- FOUND: `ab277a9` (feat GREEN)

Build: PASSED
Integration tests: 3/3 PASSED
