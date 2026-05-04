---
phase: 02-gestao-e-auditoria
plan: 01
subsystem: database, api
tags: [drizzle, postgres, approval-events, audit-trail]

requires:
  - phase: 01-foundation
    provides: approvals table + approve/reject route scaffolding

provides:
  - approval_events table (FK cascade to approvals, composite index on approval_id+created_at)
  - Idempotent migration 0009_approval_events.sql
  - approval_created event emitted by POST /api/n8n/approvals after insert
  - approval_resolved event emitted by approve + reject routes with metadata
  - Integration tests verifying events at all three call sites

affects: [02-02, 02-03]

tech-stack:
  added: []
  patterns: [fire-and-forget event insert via awaited db.insert (non-blocking path)]

key-files:
  created:
    - apps/web/db/migrations/0009_approval_events.sql
    - apps/web/db/migrations/meta/0009_snapshot.json
    - apps/web/tests/integration/approvals-events.test.ts
  modified:
    - apps/web/db/schema.ts
    - apps/web/db/migrations/meta/_journal.json
    - apps/web/src/app/api/n8n/approvals/route.ts
    - apps/web/src/app/api/approvals/[id]/approve/route.ts
    - apps/web/src/app/api/approvals/[id]/reject/route.ts

key-decisions:
  - "approval_events uses createdAt for ordering (no updatedAt — events are immutable)"
  - "actorId nullable — approval_created has no actor (triggered by n8n webhook)"
  - "metadata JSONB stores status+comment+decisionValues for approval_resolved events"
  - "Migration uses CREATE TABLE IF NOT EXISTS + DO $$ EXCEPTION block for idempotency"
  - "Composite index on (approval_id, created_at) — covers timeline query pattern in 02-03"

patterns-established:
  - "Event insert: db.insert(approvalEvents).values({...}) immediately after the primary operation, awaited but errors caught and logged (non-blocking)"

requirements-completed: [APPROV-05]

duration: 26min
completed: 2026-05-04
---

# Plan 02-01: Approval Events — Audit Trail Foundation

**approval_events table + migration + event hooks at all three approval lifecycle call sites, verified by integration tests.**

## Performance

- **Duration:** ~26 min
- **Completed:** 2026-05-04
- **Tasks:** 4
- **Files modified:** 7

## Accomplishments

- `approvalEvents` pgTable exported from schema.ts with 7 columns, `approvalEventsRelations` added, and `events` many-relation added to `approvalsRelations`
- Migration `0009_approval_events.sql` is idempotent (IF NOT EXISTS + DO $$ EXCEPTION block); applied to pruma_dev and verified via second-apply NOTICE
- POST `/api/n8n/approvals` inserts `approval_created` event immediately after approval INSERT; actorId null, metadata `{}`
- `/api/approvals/[id]/approve` and `/api/approvals/[id]/reject` each insert `approval_resolved` event with metadata `{status, comment, decisionValues}`
- Integration tests cover all three call sites and assert event presence + field values

## Self-Check: PASSED

All must_haves verified:
- approval_events table in pruma_dev with FK cascade ✓
- approval_created emitted by n8n approvals POST ✓
- approval_resolved emitted by approve + reject with correct metadata ✓
