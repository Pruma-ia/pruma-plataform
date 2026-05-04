---
phase: 02
slug: gestao-e-auditoria
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-03
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 2.x |
| **Config file** | `apps/web/vitest.config.ts` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test && npm run test:int` |
| **Estimated runtime** | ~30s unit / ~90s integration |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test && npm run test:int`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds (unit), 90 seconds (integration)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|--------|
| 02-01-T1 | 01 | 1 | APPROV-05 | — | approval_events table created; approval_created/resolved inserted | integration | `npm run test:int -- approvals-events` | ⬜ pending |
| 02-02-T1 | 02 | 2 | APPROV-01 | T-02-02 | Filters scope by organizationId; status/flowId/date WHERE applied | integration | `npm run test:int -- approvals-filters` | ⬜ pending |
| 02-02-T1 | 02 | 2 | APPROV-02 | — | Search ILIKE on title scoped to org | integration | `npm run test:int -- approvals-filters` | ⬜ pending |
| 02-02-T2 | 02 | 2 | APPROV-03 | T-02-03c | CSV export 401 when unauth; orgId scoped; RFC-4180 escaped | unit | `npm test -- export` | ⬜ pending |
| 02-02-T2 | 02 | 2 | APPROV-04 | T-02-03 | CSV export returns valid RFC-4180 with correct headers | unit | `npm test -- export` | ⬜ pending |
| 02-03-T1 | 03 | 2 | APPROV-05 | T-02-04c | Timeline events in chronological order; cross-tenant events absent | integration | `npm run test:int -- approval-timeline` | ⬜ pending |
| 02-04-T1 | 04 | 1 | ORG-03 | T-02-01 | CNPJ guard redirects when orgCnpjFilled=false; superadmin exempt | unit | `npm test -- proxy` | ⬜ pending |
| 02-04-T2 | 04 | 1 | ORG-02 | — | Onboarding saves all 8 cadastral fields via PATCH /api/user/org-profile | integration | `npm run test:int` | ⬜ pending |
| 02-04-T2 | 04 | 1 | ORG-04 | T-02-04f | Asaas sync PUT called on completion; failure logs and does not block | unit | `npm test -- asaas` | ⬜ pending |
| 02-04-T3 | 04 | 1 | INFRA-03 | T-02-02 | Flow runs list scoped by org; etapas + linked approvals correct | integration | `npm run test:int -- flow-runs-ux` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. New test files created per plan wave.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Filter pills + URL update | APPROV-01 | Browser debounce interaction | `npm run test:int:keep` → open /approvals → test filters |
| CSV file download in browser | APPROV-03 | File download requires browser | Dev server → /approvals → Exportar CSV |
| Onboarding cadastral step redirect | ORG-02 | Multi-step flow needs browser session | Register new org → verify redirect to /onboarding/cadastral |
| Timeline event icons and order | APPROV-05 | Visual correctness | `npm run test:int:keep` → open approval detail |
| Flow runs etapas count display | INFRA-03 | Payload JSON parsing visual | `npm run test:int:keep` → open /flows/[id] |

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 stubs — tests created within each plan task
- [x] No 3 consecutive tasks without automated verify — all 10 task rows have automated command
- [x] No watch-mode flags — all commands are one-shot (no `--watch`)
- [x] Feedback latency < 90s — unit tests ~30s, integration ~90s (per framework table)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pre-approved at plan creation (2026-05-04)
