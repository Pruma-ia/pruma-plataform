---
phase: 01-foundation
verified: 2026-05-02T00:00:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Register a new user end-to-end against the running dev server with Mailpit. Observe OTP email arrives, enter the code in /verify-email, confirm redirect to /dashboard occurs, confirm /verify-email is inaccessible after verification."
    expected: "OTP email arrives in Mailpit < 60s. Entering the correct 6-digit code redirects to /dashboard. Attempting /verify-email again after verification redirects back to /dashboard."
    why_human: "Playwright happy-path spec (verify-email.spec.ts spec 3) is explicitly test.skip with TODO(Plan 06). The proxy gate and JWT refresh via update() can only be observed end-to-end with a running dev server + Mailpit + Docker DB. Integration tests require Docker."
  - test: "Visit /dashboard as a freshly registered org with no flows and no approvals. Verify the onboarding checklist renders with 0 de 3 concluídos. Click 'Falar com suporte' and confirm WhatsApp link opens in a new tab AND the item gains its completed visual. Complete all three items and confirm the checklist disappears."
    expected: "Checklist visible on fresh org, correct item states update automatically, checklist disappears only after all 3 items are done (allDone=true)."
    why_human: "Conditional rendering of checklist, item-state transitions, and the disappear-on-allDone behavior require a live browser session with real DB state progression."
  - test: "Log in as owner on /settings/organization. Change the org name, upload a PNG logo <= 2MB. Confirm the header across all dashboard pages updates to show the new logo. Log in as a member-role user and confirm the form is disabled."
    expected: "Logo appears in header for all members after upload. Member sees disabled inputs. Non-PNG/non-JPG/non-WebP file is rejected with an error message."
    why_human: "R2 presigned PUT upload requires a live R2 bucket (or MinIO). Playwright spec 4 is guarded by PLAYWRIGHT_R2_ENABLED. Header logo propagation across pages requires browser navigation."
---

# Phase 1: Foundation Verification Report

**Phase Goal:** Produto seguro no cadastro e operacionalmente visível — org nova consegue começar a usar com métricas reais e perfil configurado
**Verified:** 2026-05-02T00:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Usuário novo recebe código OTP por email e não consegue acessar o painel sem verificar o endereço | ✓ VERIFIED | `register/route.ts` calls `generateAndStoreOtp()` and returns `redirectTo: "/verify-email"`. `proxy.ts` gate: `session.user.emailVerified === false` redirects to `/verify-email` for all guarded routes. `verifyOtp()` in `otp.ts` transactionally sets `users.emailVerified = new Date()`. |
| 2 | Usuário pode reenviar OTP com cooldown de 60s visível na UI | ✓ VERIFIED | `resend-otp/route.ts` enforces `COOLDOWN_MS = 60_000` via `getLatestOtpCreatedAt()`. Returns `retryAfterSeconds` on 429. `/verify-email/page.tsx` renders `Reenviar em {count}s` countdown starting at 60. |
| 3 | Dashboard exibe métricas reais da org: pendentes, resolvidas hoje, fluxos ativos, tempo médio de resolução | ✓ VERIFIED | `dashboard/page.tsx` calls `getResolvedTodayCount(orgId)`, `getAvgResolutionMs(orgId)`, `getOnboardingChecklistState(orgId)` in Promise.all. All queries use `eq(approvals.organizationId, orgId)`. Cards "Resolvidas hoje" and "Tempo médio (30d)" present. Tooltip "Sem aprovações resolvidas nos últimos 30 dias" for null avg. |
| 4 | Org nova vê checklist de primeiros passos que se marca automaticamente conforme ações são completadas e desaparece quando tudo está feito | ✓ VERIFIED | `getOnboardingChecklistState()` returns `shouldShow = (flowCount === 0 && approvalCount === 0) \|\| !allDone`. `allDone = whatsappClicked && processConfigured && firstApproval`. Dashboard renders `{checklist.shouldShow && <OnboardingChecklist ... />}`. Three items: "Agendar suporte com a Pruma", "Processo configurado pela Pruma", "Primeira aprovação recebida". |
| 5 | Owner da org pode editar nome e logo; usuário pode editar nome e ver contas conectadas | ✓ VERIFIED | `PATCH /api/organizations/profile` updates `organizations.name` and `organizations.logo`, role-gated to owner/admin. `POST /api/organizations/logo/presign` issues R2 presigned PUT URL. `PATCH /api/user/profile` updates `users.name` scoped to `session.user.id`. `ConnectedAccountsList` renders OAuth + credentials providers, no disconnect button (PROF-02 locked). |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/web/db/schema.ts` | emailOtpTokens table + organizations.onboardingWhatsappClickedAt | ✓ VERIFIED | Both present at lines 291 and 105 respectively |
| `apps/web/db/migrations/0008_silent_susan_delgado.sql` | Migration with CREATE TABLE email_otp_tokens + ADD COLUMN onboarding_whatsapp_clicked_at | ✓ VERIFIED | Both DDL statements confirmed in migration file |
| `apps/web/src/types/next-auth.d.ts` | emailVerified?: boolean on Session.user and JWT | ✓ VERIFIED | 4 occurrences: declaration comment + field on Session.user (with Omit<DefaultSession> workaround) + field on JWT |
| `apps/web/src/lib/ratelimit.ts` | 4 Upstash Ratelimit singletons | ✓ VERIFIED | authRatelimit (pruma:auth), billingRatelimit (pruma:billing), otpVerifyRatelimit (pruma:otp-verify), otpResendRatelimit (pruma:otp-resend) all exported |
| `apps/web/src/lib/auth.ts` | JWT callback populates emailVerified from DB | ✓ VERIFIED | `token.emailVerified = dbUser?.emailVerified != null` at line 91; `session.user.emailVerified` set in session callback |
| `apps/web/src/lib/otp.ts` | generateAndStoreOtp, verifyOtp, getLatestOtpCreatedAt | ✓ VERIFIED | All three exported; transactional verify with `emailVerified: new Date()` at line 49; delete-then-insert pattern |
| `apps/web/src/app/api/auth/verify-otp/route.ts` | POST endpoint validating OTP | ✓ VERIFIED | Exports POST; otpVerifyRatelimit.limit(userId); verifyOtp(); maps results to 200/400/410/429 |
| `apps/web/src/app/api/auth/resend-otp/route.ts` | POST endpoint with cooldown + rate limit | ✓ VERIFIED | COOLDOWN_MS = 60_000; otpResendRatelimit.limit(userId); retryAfterSeconds returned |
| `apps/web/src/app/(auth)/verify-email/page.tsx` | OTP entry UI with 6-cell input + resend countdown | ✓ VERIFIED | "use client"; 6 inputMode="numeric" cells; role="alert" error region; await update() after 200; Reenviar em countdown; posts to both endpoints |
| `apps/web/src/app/api/auth/register/route.ts` | Modified to generate+send OTP | ✓ VERIFIED | Imports generateAndStoreOtp; calls it after user creation; returns redirectTo: "/verify-email" |
| `apps/web/src/lib/dashboard-metrics.ts` | 4 metric helpers + checklist state | ✓ VERIFIED | getResolvedTodayCount, getAvgResolutionMs, formatAvgTime, getOnboardingChecklistState exported; all queries org-scoped; D-10 literal shouldShow expression present |
| `apps/web/src/components/dashboard/onboarding-checklist.tsx` | 3-item checklist with click handler | ✓ VERIFIED | "use client"; all 3 UI-SPEC copy strings; fetch POST to /api/onboarding/whatsapp-clicked; window.open with noopener,noreferrer |
| `apps/web/src/app/api/onboarding/whatsapp-clicked/route.ts` | POST sets onboardingWhatsappClickedAt | ✓ VERIFIED | Sets onboardingWhatsappClickedAt: new Date(), scoped to session.user.organizationId |
| `apps/web/src/app/(dashboard)/dashboard/page.tsx` | 4 cards + checklist | ✓ VERIFIED | All 4 helpers imported and called; "Resolvidas hoje" and "Tempo médio (30d)" cards; conditional OnboardingChecklist |
| `apps/web/src/app/api/organizations/logo/presign/route.ts` | POST presign with role gate | ✓ VERIFIED | PRIVILEGED_ROLES gate; LOGO_ALLOWED_MIME_TYPES; MAX_LOGO_SIZE_BYTES; buildOrgLogoR2Key; orgId from session only |
| `apps/web/src/app/api/organizations/profile/route.ts` | PATCH updates name/logo | ✓ VERIFIED | PRIVILEGED_ROLES gate; `org-logos/${orgId}/` tenant guard; drizzle update scoped to orgId |
| `apps/web/src/components/dashboard/org-logo.tsx` | Logo + initials fallback | ✓ VERIFIED | getInitials(); unoptimized Next/Image; role="img" on fallback div |
| `apps/web/src/components/dashboard/header.tsx` | Renders OrgLogo | ✓ VERIFIED | Accepts orgName + orgLogoUrl props; renders OrgLogo to left of title |
| `apps/web/src/lib/org-header-data.ts` | getOrgHeaderData helper | ✓ VERIFIED | File present (976B), exported and used across 14+ call sites |
| `apps/web/src/app/api/user/profile/route.ts` | PATCH updates users.name | ✓ VERIFIED | eq(users.id, session.user.id); Zod transform+refine for whitespace rejection |
| `apps/web/src/app/(dashboard)/settings/profile/page.tsx` | Server Component with 3 cards | ✓ VERIFIED | No "use client" at top; imports ProfileDisplayNameForm, ConnectedAccountsList, PasswordForm, getConnectedAccounts |
| `apps/web/src/app/(dashboard)/settings/profile/profile-display-name-form.tsx` | Client form with PATCH | ✓ VERIFIED | "use client"; PATCH to /api/user/profile; autoComplete="name"; role="alert" |
| `apps/web/src/app/(dashboard)/settings/profile/connected-accounts-list.tsx` | View-only accounts list | ✓ VERIFIED | No disconnect/desconectar button; pure component |
| `apps/web/src/proxy.ts` | Upstash limiters + emailVerified gate | ✓ VERIFIED | authRatelimit.limit(ip); billingRatelimit.limit(ip); emailVerified === false gate; bypass set; no in-memory Map |
| `apps/web/tests/e2e/verify-email.spec.ts` | Playwright spec for /verify-email | ✓ VERIFIED | File present (5.5K); 4 specs (render, wrong code, happy-path skip, countdown) |
| `apps/web/tests/e2e/email-verification-gate.spec.ts` | Gate end-to-end spec | ✓ VERIFIED | File present (9.2K); 6 specs covering full unverified→verified flow |
| `apps/web/tests/e2e/org-identity.spec.ts` | Playwright spec for org identity | ✓ VERIFIED | File present (8.9K) |
| `apps/web/tests/e2e/profile.spec.ts` | Playwright spec for profile | ✓ VERIFIED | File present (7.0K) |
| `apps/web/tests/integration/otp.test.ts` | OTP lifecycle integration test | ✓ VERIFIED | File present (5.5K) |
| `apps/web/tests/integration/onboarding.test.ts` | Onboarding metrics integration test | ✓ VERIFIED | File present (6.8K) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `proxy.ts` | `lib/ratelimit.authRatelimit + billingRatelimit` | import + .limit(ip) | ✓ WIRED | `await authRatelimit.limit(ip)` and `await billingRatelimit.limit(ip)` confirmed at lines 70, 83 |
| `proxy.ts` | `session.user.emailVerified` | JWT claim from auth.ts | ✓ WIRED | `session.user.emailVerified === false` at line 113; no in-memory Map remaining |
| `proxy.ts` | `/verify-email` | NextResponse.redirect | ✓ WIRED | `NextResponse.redirect(new URL("/verify-email", req.url))` at line 116 |
| `verify-email/page.tsx` | `/api/auth/verify-otp` | fetch POST | ✓ WIRED | `fetch("/api/auth/verify-otp", ...)` at line 95 |
| `verify-email/page.tsx` | `useSession().update()` | JWT refresh | ✓ WIRED | `await update()` at line 103; no signIn() or router.refresh() present |
| `register/route.ts` | `lib/otp.ts generateAndStoreOtp` | import + call after user insert | ✓ WIRED | `generateAndStoreOtp(newUserId!)` at line 87 |
| `verify-otp/route.ts` | `users.emailVerified column` | drizzle update in otp.ts transaction | ✓ WIRED | `emailVerified: new Date()` in `verifyOtp()` transaction at otp.ts line 49 |
| `dashboard/page.tsx` | `lib/dashboard-metrics.ts` | Promise.all server-side | ✓ WIRED | All 3 new helpers called in Promise.all at lines 34-36 |
| `onboarding-checklist.tsx` | `/api/onboarding/whatsapp-clicked` | fetch POST on button click | ✓ WIRED | `fetch("/api/onboarding/whatsapp-clicked", { method: "POST" })` at line 23 |
| `whatsapp-clicked/route.ts` | `organizations.onboardingWhatsappClickedAt` | drizzle update scoped by orgId | ✓ WIRED | `.set({ onboardingWhatsappClickedAt: new Date() }).where(eq(organizations.id, orgId))` |
| `org-identity-form.tsx` | `/api/organizations/logo/presign` | fetch POST | ✓ WIRED | `fetch("/api/organizations/logo/presign", ...)` at line 75 |
| `org-identity-form.tsx` | `/api/organizations/profile` | PATCH with {name?, logo?} | ✓ WIRED | `fetch("/api/organizations/profile", { method: "PATCH", ... })` at line 122 |
| `header.tsx` | `organizations.logo + organizations.name` | getOrgHeaderData in parent | ✓ WIRED | Header accepts orgName/orgLogoUrl props; org-header-data.ts centralizes the DB+presign call |
| `profile-display-name-form.tsx` | `/api/user/profile` | PATCH fetch | ✓ WIRED | `method: "PATCH"` to `/api/user/profile` at line 29 |
| `settings/profile/page.tsx` | `lib/connected-accounts.getConnectedAccounts` | server-side call | ✓ WIRED | `getConnectedAccounts(userId)` at line 26 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `dashboard/page.tsx` | resolvedToday | `getResolvedTodayCount(orgId)` → drizzle count query with `gte(approvals.updatedAt, startOfDayUtc)` | Yes — DB count query | ✓ FLOWING |
| `dashboard/page.tsx` | avgMs | `getAvgResolutionMs(orgId)` → `AVG(EXTRACT(EPOCH FROM ...))` PostgreSQL query | Yes — DB aggregation | ✓ FLOWING |
| `dashboard/page.tsx` | checklist | `getOnboardingChecklistState(orgId)` → Promise.all(org, flow count, approval count) | Yes — 3 real DB queries | ✓ FLOWING |
| `onboarding-checklist.tsx` | whatsappClicked, processConfigured, firstApproval | Props from server, derived from DB | Yes — passed from Server Component | ✓ FLOWING |
| `connected-accounts-list.tsx` | accounts | `getConnectedAccounts(userId)` → drizzle select from accounts + users.password check | Yes — real DB query | ✓ FLOWING |
| `profile-display-name-form.tsx` | initialName | Prop from Server Component page, DB-fetched `users.name` | Yes — DB select | ✓ FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED — requires running dev server, Docker, and Mailpit to be meaningful. Vitest unit tests (525+ passing) and integration tests cover the logic layer.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| AUTH-01 | Plan 01, 02, 06 | OTP email verification gate | ✓ SATISFIED | emailOtpTokens table; otp.ts; verify-otp route; proxy.ts emailVerified gate |
| AUTH-02 | Plan 02 | OTP resend with 60s cooldown | ✓ SATISFIED | COOLDOWN_MS = 60_000 in resend-otp route; retryAfterSeconds; countdown UI |
| DASH-01 | Plan 03 | Dashboard shows pending, resolved today, active flows, avg resolution time | ✓ SATISFIED | 4 metric cards in dashboard/page.tsx; getResolvedTodayCount + getAvgResolutionMs |
| DASH-02 | Plan 03 | Metrics filtered by org scope | ✓ SATISFIED | All queries use eq(approvals.organizationId, orgId); grep confirms 4 orgId occurrences |
| DASH-03 | Plan 03 | New org sees onboarding checklist | ✓ SATISFIED | shouldShow = (flowCount===0 && approvalCount===0) \|\| !allDone; 3-item checklist |
| DASH-04 | Plan 03 | Checklist items auto-mark on action completion | ✓ SATISFIED | processConfigured=flowCount>0; firstApproval=approvalCount>0; whatsappClicked from DB timestamp |
| DASH-05 | Plan 03 | Checklist disappears when all items done | ✓ SATISFIED | shouldShow=false when allDone=true (D-11 literal verified by grep) |
| ORG-01 | Plan 04 | Owner can edit org name and logo | ✓ SATISFIED | PATCH /api/organizations/profile; POST /api/organizations/logo/presign; OrgIdentityForm |
| PROF-01 | Plan 05 | User can edit display name | ✓ SATISFIED | PATCH /api/user/profile with trim+refine; ProfileDisplayNameForm |
| PROF-02 | Plan 05 | User can view connected accounts | ✓ SATISFIED | getConnectedAccounts; ConnectedAccountsList; no disconnect button (0 occurrences) |
| INFRA-01 | Plan 01, 06 | Rate limiting migrated from in-memory to Upstash | ✓ SATISFIED | authRatelimit/billingRatelimit in proxy.ts; no Map/isRateLimited remaining; @upstash/ratelimit@2.0.8 |

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `verify-email.spec.ts` (spec 3) | `test.skip` with TODO(Plan 06) | ℹ️ Info | Intentional — happy-path Playwright spec was gated on proxy.ts gate which has since landed in Plan 06. This skip is now stale and should be un-skipped; it is NOT a stub in the implementation. |
| `org-identity.spec.ts` (spec 4) | Guarded by `PLAYWRIGHT_R2_ENABLED` env var | ℹ️ Info | Logo upload E2E cannot run without MinIO/R2 in CI. Intentional guard documented in Plan 04 SUMMARY. |
| `org-identity.spec.ts` (spec 5) | `test.skip` with TODO | ℹ️ Info | Member-role test requires invite E2E helper not yet built. Intentional deferral. |

No blockers or warning-level anti-patterns found. No placeholder implementations detected. No hardcoded empty data flowing to rendered output.

### Human Verification Required

#### 1. OTP End-to-End Flow with Running Dev Server

**Test:** Register a new user via the UI. Observe OTP email in Mailpit. Enter the 6-digit code on /verify-email. Confirm redirect to /dashboard occurs. Attempt to navigate back to /verify-email and confirm redirect to /dashboard (not a loop).
**Expected:** OTP arrives in Mailpit within 60s. Correct code redirects to /dashboard. Incorrect code shows "Código incorreto" error. After verification, /verify-email redirects to /dashboard.
**Why human:** Playwright happy-path spec (spec 3 in verify-email.spec.ts) is explicitly `test.skip` with a TODO referencing Plan 06. Integration tests require Docker. The JWT refresh via `await update()` and the proxy gate interaction can only be observed with a live session.

#### 2. Onboarding Checklist State Progression in Browser

**Test:** Log in as a fresh org (no flows, no approvals). Navigate to /dashboard. Verify checklist shows "0 de 3 concluídos". Click "Falar com suporte", confirm WhatsApp link opens and item 1 marks complete. Wait for a flow and approval to be created (or seed them). Confirm checklist eventually shows "3 de 3 concluídos" then disappears.
**Expected:** Checklist visible for fresh org. Items check off automatically as org state changes. Checklist disappears exactly when allDone=true.
**Why human:** Real DB state transitions, browser rendering of state changes, and the disappear-on-allDone behavior require a live session. Integration tests cover the query logic but not the rendered output.

#### 3. Org Logo Upload and Header Display

**Test:** Log in as owner. Go to /settings/organization. Upload a valid PNG logo (< 2MB). Submit the form. Navigate to /dashboard, /flows, /approvals — verify the logo appears in the header on all pages. Log in as a member-role user and confirm the form fields are disabled.
**Expected:** Logo displays in header for all members after upload. Member sees disabled form with no upload picker. Uploading an image/gif is rejected client-side with an error message about file type.
**Why human:** R2 presigned PUT upload requires a live R2 bucket or MinIO. Playwright spec 4 in org-identity.spec.ts is guarded by `PLAYWRIGHT_R2_ENABLED`. The header propagation across pages requires browser navigation.

### Gaps Summary

No gaps found. All 5 observable truths are verified, all required artifacts exist with substantive implementations, all key links are wired, and data flows from real DB queries to rendered output. The 3 human verification items are behavioral confirmations of flows that are fully implemented in code but require a running environment to observe end-to-end.

---

_Verified: 2026-05-02T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
