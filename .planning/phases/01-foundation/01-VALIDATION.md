---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-02
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (unit) + Playwright (E2E) |
| **Config file** | apps/web/vitest.config.ts / apps/web/playwright.config.ts |
| **Quick run command** | `cd apps/web && npx tsc --noEmit && npx vitest run` |
| **Full suite command** | `cd apps/web && npx tsc --noEmit && npx vitest run && npx playwright test` |
| **Estimated runtime** | ~60 seconds (unit) / ~3 min (full with Playwright) |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/web && npx tsc --noEmit`
- **After every plan wave:** Run `cd apps/web && npx tsc --noEmit && npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-??-01 | OTP Schema | 1 | AUTH-01 | — | emailOtpTokens stores hash not plaintext | unit | `vitest run -- otp` | ❌ W0 | ⬜ pending |
| 1-??-02 | OTP API | 1 | AUTH-01/02 | — | POST /api/auth/verify-otp accepts valid OTP, rejects expired | unit | `vitest run -- verify-otp` | ❌ W0 | ⬜ pending |
| 1-??-03 | proxy.ts gate | 1 | AUTH-01 | — | emailVerified=false → redirect /verify-email | unit | `vitest run -- proxy` | ❌ W0 | ⬜ pending |
| 1-??-04 | Dashboard metrics | 2 | DASH-01/02 | — | Queries filter by organizationId | unit | `vitest run -- dashboard` | ❌ W0 | ⬜ pending |
| 1-??-05 | Onboarding checklist | 2 | DASH-03/04/05 | — | State derived from DB counts | unit | `vitest run -- checklist` | ❌ W0 | ⬜ pending |
| 1-??-06 | Logo upload | 3 | ORG-01 | — | Server validates MIME + size before presigning | unit | `vitest run -- logo` | ❌ W0 | ⬜ pending |
| 1-??-07 | Upstash migration | 1 | INFRA-01 | — | Rate limiter calls Upstash, not in-memory Map | unit | `vitest run -- ratelimit` | ❌ W0 | ⬜ pending |
| 1-??-08 | Profile page | 3 | PROF-01/02 | — | Connected accounts list is view-only | e2e | `playwright test -- profile` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/web/src/__tests__/otp.test.ts` — stubs for AUTH-01/02
- [ ] `apps/web/src/__tests__/proxy.test.ts` — stubs for AUTH-01 gate
- [ ] `apps/web/src/__tests__/dashboard.test.ts` — stubs for DASH-01/02
- [ ] `apps/web/src/__tests__/checklist.test.ts` — stubs for DASH-03/04/05
- [ ] `apps/web/src/__tests__/logo.test.ts` — stubs for ORG-01
- [ ] `apps/web/src/__tests__/ratelimit.test.ts` — stubs for INFRA-01
- [ ] `apps/web/tests/e2e/profile.spec.ts` — stubs for PROF-01/02

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| OTP email actually delivered | AUTH-01 | Requires real SMTP / Resend in staging | Register new account in staging, verify email arrives within 60s |
| JWT refreshes after OTP verification | AUTH-01 | Requires browser session state | Verify OTP in browser, confirm next request to /dashboard carries emailVerified=true in session |
| Logo appears in header after upload | ORG-01 | Visual regression | Upload logo in org settings, reload dashboard, confirm logo appears in header |
| Upstash rate limit triggers at threshold | INFRA-01 | Requires Upstash real connection | Hit /api/auth/resend-otp 6× in 60s, confirm 429 returned |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
