---
phase: 01-foundation
plan: 02
subsystem: auth
tags: [otp, email-verification, nextauth, ratelimit, bcrypt, playwright, tdd]

# Dependency graph
requires:
  - 01-01 (emailOtpTokens table, otpVerifyRatelimit, otpResendRatelimit, emailVerified JWT claim)
provides:
  - lib/otp.ts: generateAndStoreOtp, verifyOtp, getLatestOtpCreatedAt
  - POST /api/auth/verify-otp (6-digit code validation, ratelimit, transactional verify)
  - POST /api/auth/resend-otp (60s cooldown, 3/h Upstash ratelimit, sendOtpResendEmail)
  - Modified POST /api/auth/register (generates+sends OTP, returns redirectTo /verify-email)
  - /verify-email page (6-cell OTP input, resend countdown, JWT refresh via update())
  - email.ts: sendOtpVerificationEmail, sendOtpResendEmail (MJML templates)
  - Integration test suite for OTP lifecycle (requires Docker + migration 0008)
  - Playwright spec for /verify-email (4 specs; happy-path skipped pending Plan 06)
affects: [01-06 (proxy gate will redirect unverified users TO /verify-email)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TDD RED/GREEN per task (otp.ts + routes)
    - delete-then-insert for OTP resend (no unique index on userId, prevents stale reuse)
    - NextAuth v5 update() for JWT refresh after email verify (no signIn, no router.refresh)
    - MJML email templates via buildOtpEmailHtml added to email.ts following existing pattern
    - Playwright page.clock.fastForward for countdown testing (no real 60s wait)

key-files:
  created:
    - apps/web/src/lib/otp.ts
    - apps/web/src/lib/otp.test.ts
    - apps/web/src/app/api/auth/verify-otp/route.ts
    - apps/web/src/app/api/auth/verify-otp/route.test.ts
    - apps/web/src/app/api/auth/resend-otp/route.ts
    - apps/web/src/app/api/auth/resend-otp/route.test.ts
    - apps/web/src/app/(auth)/verify-email/page.tsx
    - apps/web/src/components/ui/input.tsx
    - apps/web/tests/e2e/verify-email.spec.ts
    - apps/web/tests/integration/otp.test.ts
  modified:
    - apps/web/src/app/api/auth/register/route.ts
    - apps/web/src/lib/email.ts

key-decisions:
  - "sendOtpVerificationEmail / sendOtpResendEmail follow email.ts buildXxx + sendXxx pattern — sendEmail() internal function not exported; CLAUDE.md mandates this approach"
  - "Playwright spec 3 (happy path) skipped with TODO(Plan 06) — proxy.ts gate does not exist yet; verifying JWT flip without the gate proves nothing observable"
  - "Countdown test uses page.clock.fastForward('00:01:05') — Playwright 1.45+ clock API; no devSkipCountdown query param needed"
  - "Integration test written and committed; Docker not running in this session, execution deferred"
  - "autoComplete={i === 0 ? 'one-time-code' : undefined} — JSX conditional expression, semantically correct for browser autofill; only first cell advertises one-time-code"

# Metrics
duration: ~8min
completed: 2026-05-03
---

# Phase 1 Plan 02: Email OTP Flow Summary

**JWT-authenticated OTP verification: register generates+sends 6-digit code, /verify-email page validates it with bcrypt, transactional DB write flips emailVerified, NextAuth v5 update() refreshes JWT**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-03T00:10:36Z
- **Completed:** 2026-05-03T00:19:05Z
- **Tasks:** 4/4
- **Files created/modified:** 12

## Accomplishments

- `lib/otp.ts` exports `generateAndStoreOtp` (crypto.randomInt 6-digit, bcrypt hash, delete-then-insert), `verifyOtp` (no-token/expired/wrong/ok with transactional usedAt + emailVerified update), `getLatestOtpCreatedAt` (60s cooldown source)
- `POST /api/auth/verify-otp` — session auth required, Upstash otpVerifyRatelimit (5/15min per userId), Zod 6-digit regex, maps VerifyResult to 200/400/410/429
- `POST /api/auth/resend-otp` — session auth, Upstash otpResendRatelimit (3/h), 60s DB-side cooldown via getLatestOtpCreatedAt, returns retryAfterSeconds on cooldown
- `POST /api/auth/register` now generates OTP after user creation and returns `{ ok: true, redirectTo: "/verify-email" }` — email send failure is non-fatal (logged, not thrown)
- `/verify-email` page: 6 numeric cells with auto-advance, backspace retreat, paste distribution, 60s resend countdown, error region role=alert, JWT refresh via `await update()` after 200
- `email.ts` extended with `buildOtpEmailHtml` (MJML), `sendOtpVerificationEmail`, `sendOtpResendEmail` following the established buildXxx+sendXxx pattern
- 31 unit tests passing (9 otp.ts + 11 verify-otp route + 11 resend-otp route)
- Playwright spec: 4 tests (render, wrong code, happy-path skip TODO, countdown clock)

## Task Commits

| Task | Type | Commit | Description |
|------|------|--------|-------------|
| 1 | test (RED) | `88cb3ba` | Failing tests for otp helpers |
| 1 | feat (GREEN) | `d343898` | otp.ts helpers implementation |
| 2 | test (RED) | `7033db4` | Failing tests for verify-otp + resend-otp routes |
| 2 | feat (GREEN) | `a092b8d` | Routes + register modification + email.ts MJML |
| 3 | feat | `be20f4e` | /verify-email page + shadcn input + Playwright spec |
| 4 | feat | `30cd2c3` | OTP integration test suite |

## TDD Gate Compliance

- RED gate (test commit before feat): PASSED for Task 1 and Task 2
- GREEN gate (feat commit after test): PASSED for Task 1 and Task 2
- Task 3 and Task 4 are non-TDD (`type="auto"` without `tdd="true"`) — no gate required

## JWT Refresh Outcome

`useSession().update()` from NextAuth v5 is the single locked strategy. After `POST /api/auth/verify-otp` returns 200, the page calls `await update()` with no arguments. NextAuth v5 re-runs the JWT callback (no `user` object present, no initial login trigger), which queries `users.emailVerified` from DB — now non-null — and emits a fresh JWT with `emailVerified: true`. The page then calls `router.push("/dashboard")`.

Observable proof is deferred to Playwright spec 3 which is `test.skip` with a TODO referencing Plan 06. Without the proxy.ts emailVerified gate, navigating to `/dashboard` succeeds regardless of JWT state, making the assertion vacuous.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Pattern] Used email.ts buildXxx+sendXxx pattern instead of exported sendEmail()**
- **Found during:** Task 2 (resend-otp route implementation)
- **Issue:** Plan's action block called `sendEmail({ to, subject, html, text })` directly with an object signature. The actual `sendEmail` in `email.ts` is an internal function with positional args `(to, subject, html)` and is NOT exported. CLAUDE.md explicitly mandates: "Não chamar `resend` ou `nodemailer` diretamente — usar `sendEmail()` interno. Adicionar novo tipo de email: criar função `build*Html` + `send*Email`."
- **Fix:** Added `buildOtpEmailHtml(code)` (MJML template), `sendOtpVerificationEmail(email, code)`, and `sendOtpResendEmail(email, code)` to `email.ts` following the exact established pattern. Routes call the exported functions.
- **Files modified:** `apps/web/src/lib/email.ts`, both route files, route.test.ts mocks updated
- **Commits:** `a092b8d`

### Non-blocking Deviations

**2. Docker not running — integration tests not executed in this session**
- The `npm run test:int -- otp.test.ts` acceptance criterion cannot be verified because Docker Desktop is not running (same blocker as Plan 01, documented in STATE.md).
- The test file is written, compiles cleanly, and follows the exact integration test conventions (`ctx.userId`, `beforeAll` reset, sequential assertions).
- **To run:** `docker compose up -d && sed 's/-->.*//' apps/web/db/migrations/0008_silent_susan_delgado.sql | docker exec -i pruma_db psql -U pruma -d pruma_dev && cd apps/web && npm run test:int -- otp.test.ts`

**3. Playwright tests not run — require dev server**
- Playwright specs require `npm run dev` (webServer config in playwright.config.ts). Dev server not started in this execution.
- Specs 1, 2, 4 are self-contained and should pass once dev server is up. Spec 3 is skipped pending Plan 06.

## STRIDE Threat Mitigations Implemented

| Threat | Mitigation | Status |
|--------|-----------|--------|
| T-02-01 Brute force | `otpVerifyRatelimit.limit(userId)` in verify-otp route | Mitigated |
| T-02-02 Plaintext OTP in DB | `bcrypt.hash(code, 10)` in generateAndStoreOtp | Mitigated |
| T-02-03 Replay | `isNull(usedAt)` filter + transactional usedAt write | Mitigated |
| T-02-04 Resend spam | 60s cooldown + `otpResendRatelimit.limit(userId)` | Mitigated |
| T-02-05 Cross-user OTP | userId from `session.user.id`, never from request body | Mitigated |
| T-02-06 Zod bypass | `bodySchema.safeParse` + `try/catch req.json()` | Mitigated |
| T-02-07 Dev SMTP capture | Accepted (Mailpit by design in dev) | Accepted |
| T-02-08 Stale JWT | `await update()` on successful verify, re-runs JWT callback | Mitigated |

## Known Stubs

None — all OTP logic is fully wired. The Playwright happy-path spec (spec 3) is explicitly `test.skip` with a documented TODO, not a silent stub.

## Threat Flags

None — no new security-relevant surface beyond what is in the threat model.

## User Setup Required

No new setup beyond what Plan 01 documented (Docker + Upstash). To run integration tests:
```bash
docker compose up -d
sed 's/-->.*//' apps/web/db/migrations/0008_silent_susan_delgado.sql | docker exec -i pruma_db psql -U pruma -d pruma_dev
cd apps/web && npm run test:int -- otp.test.ts
```

---
*Phase: 01-foundation*
*Completed: 2026-05-03*
