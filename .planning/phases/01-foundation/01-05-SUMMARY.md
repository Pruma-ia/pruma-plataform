---
phase: 01-foundation
plan: "05"
subsystem: user-profile
tags: [profile, display-name, connected-accounts, nextauth, tdd, playwright]
dependency_graph:
  requires: [01-01, 01-04]
  provides: [patch-user-profile, connected-accounts-helper, profile-page-server-component]
  affects:
    - apps/web/src/app/(dashboard)/settings/profile/page.tsx
    - apps/web/src/app/api/user/profile/route.ts
    - apps/web/src/lib/connected-accounts.ts
tech_stack:
  added: []
  patterns:
    - "getConnectedAccounts(userId) — infers credentials from users.password; OAuth from accounts table"
    - "Server Component page shell + extracted PasswordForm client component"
    - "PATCH /api/user/profile scoped to session.user.id only — body.userId never trusted"
key_files:
  created:
    - apps/web/src/app/api/user/profile/route.ts
    - apps/web/src/app/api/user/profile/route.test.ts
    - apps/web/src/lib/connected-accounts.ts
    - apps/web/src/lib/connected-accounts.test.ts
    - apps/web/src/app/(dashboard)/settings/profile/password-form.tsx
    - apps/web/src/app/(dashboard)/settings/profile/profile-display-name-form.tsx
    - apps/web/src/app/(dashboard)/settings/profile/profile-display-name-form.test.tsx
    - apps/web/src/app/(dashboard)/settings/profile/connected-accounts-list.tsx
    - apps/web/src/app/(dashboard)/settings/profile/connected-accounts-list.test.tsx
    - apps/web/tests/e2e/profile.spec.ts
  modified:
    - apps/web/src/app/(dashboard)/settings/profile/page.tsx
decisions:
  - "accounts table confirmed in apps/web/db/schema.ts — exported as `accounts` with provider + providerAccountId columns"
  - "Password column is users.password (not passwordHash) — plan's getConnectedAccounts adapted accordingly"
  - "credentials entry inferred from users.password truthy — credentials logins never produce OAuth account rows"
  - "ConnectedAccountsList is a pure Server Component (props-only, no hooks) — no disconnect button per PROF-02"
  - "ProfileDisplayNameForm disables submit when name.trim() === initialName.trim() — prevents no-op PATCH calls"
metrics:
  duration: "~25 minutes"
  completed: "2026-05-03"
  tasks: 4
  files_created: 10
  files_modified: 1
  tests_added: 23
  tests_total_after: ~525
---

# Phase 1 Plan 05: User Profile (Display Name + Connected Accounts) Summary

PATCH /api/user/profile + getConnectedAccounts helper wired to Server Component page shell — user can edit display name and view OAuth/credentials providers read-only.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | PATCH /api/user/profile (TDD) | f948262 | route.ts, route.test.ts |
| 2 | getConnectedAccounts helper (TDD) | 56f1352 | connected-accounts.ts, .test.ts |
| 3 | Profile page refactor + display-name form + connected accounts list | ea1a451 | page.tsx, password-form.tsx, profile-display-name-form.tsx+test, connected-accounts-list.tsx+test |
| 4 | Playwright spec — /settings/profile | 8a855bb | profile.spec.ts |

## Schema Discoveries

**accounts table:** Exported from `apps/web/db/schema.ts` as `accounts` with columns `userId`, `provider`, `providerAccountId`. No separate auth-schema file needed.

**Password column:** `users.password` (not `passwordHash`). The plan template referenced `userRow?.passwordHash` — adapted to `userRow?.password` in `connected-accounts.ts`.

## Verification Results

- `npx tsc --noEmit`: 0 new errors (1 pre-existing in `.next/types/validator.ts`, out of scope)
- `npx vitest run`: 525 tests passing, 0 failing
  - `api/user/profile`: 11 tests
  - `lib/connected-accounts`: 5 tests
  - `profile-display-name-form`: 7 tests
  - `connected-accounts-list`: 6 tests (including PROF-02 no-disconnect assertion)
- Security grep gates:
  - `eq(users.id, session.user.id)` in route.ts: 1 occurrence (T-05-01 mitigated)
  - `desconectar|disconnect` in connected-accounts-list.tsx: 0 occurrences (PROF-02 locked)

## Deviations from Plan

### Auto-fixed Issues

**[Rule 1 - Adaptation] users.password instead of users.passwordHash**
- **Found during:** Task 2
- **Issue:** Plan template used `users.passwordHash` but the actual schema column is `users.password`
- **Fix:** Used `users.password` throughout `connected-accounts.ts`
- **Files modified:** `apps/web/src/lib/connected-accounts.ts`
- **Commit:** 56f1352

**[Rule 2 - Accessibility] Added htmlFor/id/autoComplete to PasswordForm**
- **Found during:** Task 3
- **Issue:** Original `page.tsx` password form had no `htmlFor`, no `id`, no `autoComplete` on inputs — violates CLAUDE.md form conventions
- **Fix:** Added `htmlFor="current-password"`, `id="current-password"`, `autoComplete="current-password"` etc. to all three password inputs in `password-form.tsx`
- **Files modified:** `apps/web/src/app/(dashboard)/settings/profile/password-form.tsx`
- **Commit:** ea1a451

## Known Stubs

None. All data is wired:
- Display name reads from `users.name` via server-side DB query
- Connected accounts reads from `accounts` table + `users.password` inference
- Password form calls real `/api/user/password` endpoint (unchanged behavior)

## Threat Flags

No new security surface beyond the plan's threat model (T-05-01 through T-05-06). All blocking threats mitigated:
- T-05-01: userId tampering — route reads `session.user.id` only; body schema has no userId field
- T-05-02: cross-user accounts leak — `getConnectedAccounts` scoped by `eq(accounts.userId, userId)` from session
- T-05-04: XSS via name field — React text interpolation (auto-escaped), Zod max 120 chars

## Self-Check: PASSED
