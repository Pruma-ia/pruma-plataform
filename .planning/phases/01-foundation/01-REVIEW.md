---
phase: 01-foundation
reviewed: 2026-05-02T00:00:00Z
depth: standard
files_reviewed: 23
files_reviewed_list:
  - apps/web/src/lib/auth.ts
  - apps/web/src/lib/ratelimit.ts
  - apps/web/src/lib/otp.ts
  - apps/web/src/lib/dashboard-metrics.ts
  - apps/web/src/lib/email.ts
  - apps/web/src/lib/r2.ts
  - apps/web/src/lib/connected-accounts.ts
  - apps/web/src/lib/org-header-data.ts
  - apps/web/src/proxy.ts
  - apps/web/src/app/api/auth/register/route.ts
  - apps/web/src/app/api/auth/verify-otp/route.ts
  - apps/web/src/app/api/auth/resend-otp/route.ts
  - apps/web/src/app/api/onboarding/whatsapp-clicked/route.ts
  - apps/web/src/app/api/organizations/logo/presign/route.ts
  - apps/web/src/app/api/organizations/profile/route.ts
  - apps/web/src/app/api/user/profile/route.ts
  - apps/web/src/app/(auth)/verify-email/page.tsx
  - apps/web/src/app/(dashboard)/dashboard/page.tsx
  - apps/web/src/app/(dashboard)/settings/organization/org-identity-form.tsx
  - apps/web/src/app/(dashboard)/settings/profile/page.tsx
  - apps/web/src/components/dashboard/header.tsx
  - apps/web/src/components/dashboard/onboarding-checklist.tsx
  - apps/web/src/components/dashboard/org-logo.tsx
findings:
  critical: 5
  warning: 6
  info: 2
  total: 13
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-05-02
**Depth:** standard
**Files Reviewed:** 23
**Status:** issues_found

## Summary

The foundation implements OTP email verification, rate limiting via Upstash, dashboard metrics, org logo upload via R2 presign, and connected-accounts display. The auth pipeline (proxy guards → verify-otp route → JWT refresh) is architecturally sound and the multi-tenant isolation pattern (orgId always from session, never from request body) is consistently applied.

However, five blockers exist that must be fixed before shipping: two of them are security vulnerabilities (unescaped URLs in MJML email HTML enabling email-client-side injection, and the `/billing` page being unprotected by both the emailVerified gate and the subscription guard); two are correctness issues (registration leaves partial data on failure due to missing transaction wrapper, and the `emailVerified` JWT claim is never updated in the session after OTP verification succeeds); and one is a silent data-integrity gap (delete-then-insert OTP generation is not atomic, enabling a race between concurrent resend requests).

---

## Critical Issues

### CR-01: Unescaped URLs interpolated into MJML email HTML (email injection)

**File:** `apps/web/src/lib/email.ts:71` and `apps/web/src/lib/email.ts:156`

**Issue:** `resetUrl` and `approvalUrl` are interpolated directly into MJML template strings using `${resetUrl}` and `${approvalUrl}` without any HTML escaping. `escapeHtml()` is defined in the same file and is correctly applied to user-controlled strings (`title`, `flowName`, `description`, `filenames`), but the URL parameters are left unescaped.

`approvalUrl` is constructed from `params.approvalId` (a UUID from the database — low risk in practice) and `NEXT_PUBLIC_APP_URL` (environment variable). `resetUrl` is a caller-supplied string — if any caller ever constructs it from a user-supplied redirect parameter, an attacker who can influence that value could inject arbitrary HTML into the email, including `">` sequences that break out of the `href` attribute context and inject visible content or malicious links.

Even where the current callers are safe, this is a latent injection pattern: the function signature accepts an arbitrary `string`, so nothing prevents a future caller from passing a URL containing `">`.

**Fix:**
```typescript
// Add URL escaping alongside the existing escapeHtml helper:
function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")
}

// In buildPasswordResetHtml:
href="${escapeAttr(resetUrl)}"

// In buildApprovalNotificationHtml:
href="${escapeAttr(approvalUrl)}"
```

---

### CR-02: `/billing` page is not matched by the proxy — emailVerified gate and subscription guard are both bypassed

**File:** `apps/web/src/proxy.ts:153-171` (matcher config)

**Issue:** The proxy `config.matcher` array does not include `/billing` or `/billing/:path*`. As a result:

1. The emailVerified gate (lines 109-117) never runs for `/billing` — an unverified user navigating directly to `/billing` bypasses the redirect to `/verify-email`.
2. The subscription guard redirects blocked users to `/billing` (line 146), but since `/billing` itself is not in the matcher, any guard logic for `/billing` is also absent. This is less immediately harmful but inconsistent — a user with `canceled` subscription can freely access `/billing` directly without auth.

The subscription guard's redirect target (`/billing`) must be reachable, but the emailVerified gate should still apply to it.

**Fix:**
```typescript
export const config = {
  matcher: [
    "/admin/:path*",
    "/onboarding/:path*",
    "/onboarding",
    "/dashboard/:path*",
    "/flows/:path*",
    "/approvals/:path*",
    "/settings/:path*",
    "/billing",          // ADD
    "/billing/:path*",   // ADD
    "/verify-email",
    "/api/auth/:path*",
    "/api/n8n/:path*",
    "/api/user/:path*",
    "/api/billing/checkout",
    "/api/billing/unified-checkout",
    "/api/billing/setup-charge/pay",
  ],
}
```

Then add `/billing` and `/billing/:path*` to `EMAIL_VERIFY_BYPASS` so the subscription guard's redirect target remains reachable by verified users, or leave it out of the bypass so unverified users cannot reach billing — choose based on product intent. At minimum, the matcher must cover `/billing` so the guards can run at all.

---

### CR-03: Registration writes partial data on failure — no enclosing transaction

**File:** `apps/web/src/app/api/auth/register/route.ts:52-73`

**Issue:** The registration flow executes four sequential database writes (insert user, insert organization, insert organization member, and a conditional slug-conflict read+insert) with no enclosing transaction. If any step after `db.insert(users)` fails — for example the org insert fails due to a transient DB error — the user row is left in the database without an organization or member record.

The consequence is an orphaned user account: the user cannot log in via the email-verify flow (which requires an org to be in the session), cannot register again (email already exists), and is stuck. There is no cleanup path documented.

**Fix:**
```typescript
export async function POST(req: Request) {
  // ... validation unchanged ...

  await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ name, email, password: hashed, acceptedTermsAt: new Date(), marketingConsent })
      .returning()

    let slug = slugify(organizationName)
    const [slugConflict] = await tx
      .select()
      .from(organizations)
      .where(eq(organizations.slug, slug))
    if (slugConflict) slug = `${slug}-${Date.now()}`

    const [org] = await tx
      .insert(organizations)
      .values({ name: organizationName, slug })
      .returning()

    await tx.insert(organizationMembers).values({
      organizationId: org.id,
      userId: user.id,
      role: "owner",
      acceptedAt: new Date(),
    })

    // OTP send outside transaction (network I/O not DB) — capture userId for use after tx
    userId = user.id
    userEmail = user.email
  })

  try {
    const code = await generateAndStoreOtp(userId)
    await sendOtpVerificationEmail(userEmail, code)
  } catch (err) {
    console.error("[register] OTP send failed", err)
  }

  return NextResponse.json({ ok: true, redirectTo: "/verify-email" })
}
```

---

### CR-04: `emailVerified` in the JWT is never refreshed after OTP verification succeeds

**File:** `apps/web/src/lib/auth.ts:50-101` (jwt callback) and `apps/web/src/app/(auth)/verify-email/page.tsx:102-103`

**Issue:** After a successful OTP verification, the client calls `await update()` (NextAuth session update trigger) and then pushes to `/dashboard`. However, the `jwt` callback in `auth.ts` only re-reads `emailVerified` from the database on the initial login (when `user` is truthy, line 53). On subsequent JWT refreshes — including the one triggered by `update()` — the existing token is returned as-is, because none of the three code paths (lines 104-128, lines 130-147) re-reads `emailVerified` from the database.

The result: calling `update()` from the verify-email page does NOT flip `token.emailVerified` to `true`. The proxy's emailVerified gate (proxy.ts:110-116) checks `session.user.emailVerified === false` and will redirect every navigation attempt back to `/verify-email` even after successful verification, until the user logs out and back in (which issues a fresh token).

**Fix:** Add a re-read of `emailVerified` in the token refresh paths, or handle it in the `update()` trigger. The cleanest fix is to add a re-read of `emailVerified` whenever the token does not yet have it as `true`:

```typescript
// In jwt callback, before the final `return token` at line 147:
if (!token.isSuperAdmin && token.emailVerified === false && token.id) {
  const [dbUser] = await db
    .select({ emailVerified: users.emailVerified })
    .from(users)
    .where(eq(users.id, token.id as string))
    .limit(1)
  if (dbUser?.emailVerified != null) {
    token.emailVerified = true
  }
}
```

Alternatively, pass `{ emailVerified: true }` as the trigger argument when calling `update()` from the verify-email page, and handle it in a dedicated branch in the jwt callback.

---

### CR-05: OTP delete-then-insert is not atomic — concurrent resend requests race

**File:** `apps/web/src/lib/otp.ts:15-18`

**Issue:** `generateAndStoreOtp` performs the operation as two separate statements:
```typescript
await db.delete(emailOtpTokens).where(eq(emailOtpTokens.userId, userId))
await db.insert(emailOtpTokens).values({ userId, tokenHash, expiresAt })
```

These are not wrapped in a transaction. If two resend requests arrive concurrently (possible even with the 60-second cooldown because the cooldown check and the rate-limit check happen before this function is called, not inside it), both could execute the `DELETE` before either completes the `INSERT`. The second `INSERT` then creates a new row, but the first `INSERT` may also create a row after the second's delete, resulting in two live OTP rows for the same user. The `verifyOtp` query uses `LIMIT 1 ORDER BY createdAt DESC`, so only the newest is checked — but this is an undocumented data-integrity dependency.

More critically: under the two-concurrent-requests scenario, one of the inserts may fail with a constraint violation if a `UNIQUE` index is added to `userId` in a future migration (which is the natural evolution of the intended one-active-row invariant).

**Fix:**
```typescript
export async function generateAndStoreOtp(userId: string): Promise<string> {
  const code = crypto.randomInt(100_000, 1_000_000).toString()
  const tokenHash = await bcrypt.hash(code, BCRYPT_ROUNDS)
  const expiresAt = new Date(Date.now() + OTP_TTL_MS)

  await db.transaction(async (tx) => {
    await tx.delete(emailOtpTokens).where(eq(emailOtpTokens.userId, userId))
    await tx.insert(emailOtpTokens).values({ userId, tokenHash, expiresAt })
  })

  return code
}
```

---

## Warnings

### WR-01: `console.error` left in production route handler

**File:** `apps/web/src/app/api/auth/register/route.ts:80`

**Issue:** `console.error("[register] OTP send failed", err)` is production code. Per project coding standards (typescript/coding-style.md), no `console.*` calls should appear in production code. In addition, this logs the full error object `err` — if the email library includes configuration details (SMTP credentials, Resend API response bodies) in the error, they will appear in Vercel logs which may be accessible beyond the immediate team.

**Fix:** Replace with a structured logger (or a minimal wrapper that redacts sensitive fields), or at minimum log only `err instanceof Error ? err.message : String(err)` rather than the raw error object.

---

### WR-02: `getOrgHeaderData` silently returns empty string for org name when org not found

**File:** `apps/web/src/lib/org-header-data.ts:25-27`

**Issue:** When the org row is not found (`!org`), the function returns `{ name: "", logoUrl: null }`. The empty string is then passed to `Header` and `OrgLogo`, where `getInitials("")` returns `"?"` (the fallback). This means a misconfigured `orgId` in the session — which should be an exceptional condition — silently degrades to a `"?"` initials badge rather than surfacing the error. A deleted or migrated organization would be invisible to debugging.

**Fix:** Throw (or return a typed error) so callers can decide how to surface the condition, rather than degrading silently:
```typescript
if (!org) {
  // Org not found for a session-provided ID is an unexpected state.
  // Log and return safe fallback, or throw depending on caller needs.
  console.warn(`[org-header-data] org ${orgId} not found — session may be stale`)
  return { name: "", logoUrl: null }
}
```

At minimum, add a log line so the condition is observable.

---

### WR-03: `SUPPORT_WHATSAPP_LINK` is a server-only env var exposed to client component via Server Component prop

**File:** `apps/web/src/app/(dashboard)/dashboard/page.tsx:129`

**Issue:**
```typescript
whatsappLink={process.env.SUPPORT_WHATSAPP_LINK ?? "#"}
```

`SUPPORT_WHATSAPP_LINK` is not prefixed with `NEXT_PUBLIC_`. This works correctly at runtime because `DashboardPage` is a Server Component and the value is passed as a prop to `OnboardingChecklist`. However, it establishes a pattern that is fragile: if `OnboardingChecklist` is ever refactored to read this value directly (e.g., via a context or hook), it will silently get `undefined` because non-`NEXT_PUBLIC_` variables are not bundled into the client. The `#` fallback then sends users to a dead link with no error.

**Fix:** Either rename to `NEXT_PUBLIC_SUPPORT_WHATSAPP_LINK` (since it is not sensitive), or add a startup assertion that the variable is defined, so a misconfigured deployment fails loudly rather than serving `#`.

---

### WR-04: Proxy emailVerified gate does not cover `/api/organizations/logo/presign` and `/api/onboarding/*`

**File:** `apps/web/src/proxy.ts:153-171` (matcher)

**Issue:** The proxy matcher includes `/api/auth/:path*` and `/api/user/:path*` but does not include `/api/organizations/:path*` or `/api/onboarding/:path*`. These routes are therefore never intercepted by the proxy, meaning the emailVerified gate, the onboarding guard, and the subscription guard all do not run for these paths.

An unverified user with a valid session can call `POST /api/organizations/logo/presign`, `POST /api/organizations/profile`, or `POST /api/onboarding/whatsapp-clicked` directly. The individual route handlers do authenticate (`auth()` + session check), so there is no unauthenticated access — but the business-level gate (emailVerified) is bypassed at the API layer.

Whether this is acceptable depends on product policy. The verify-otp route handler itself does not re-check `emailVerified` before updating the DB — it correctly handles only the OTP check. But profile mutation before verification completing is a data-consistency concern.

**Fix:** Add these paths to the proxy matcher:
```typescript
"/api/organizations/:path*",
"/api/onboarding/:path*",
```
Then add them to `EMAIL_VERIFY_BYPASS` if they should be callable during verification, or leave them out to require verified email for all org/onboarding API calls.

---

### WR-05: `verify-email` page clears digit inputs and refocuses on successful submission before redirect

**File:** `apps/web/src/app/(auth)/verify-email/page.tsx:120-123`

**Issue:** The `finally` block unconditionally clears all digit inputs and refocuses cell 0:
```typescript
} finally {
  setLoading(false)
  setDigits(Array(DIGIT_COUNT).fill(""))
  focusCell(0)
}
```

This runs even on a successful submission (`result === "ok"`). On success, the code calls `await update()` and then `router.push("/dashboard")`. If the `update()` call or the router navigation has any latency, the user sees the digit inputs flash to empty and focus moves to cell 0 momentarily before the redirect fires. This is a minor UX defect but also a real correctness issue: if the redirect fails or is slow, the success state is visually undifferentiated from an error state — the user sees blank inputs and no error message, with no indication that verification succeeded.

**Fix:** Only clear inputs and refocus in the error branch, not in `finally`:
```typescript
if (res.ok) {
  await update()
  router.push("/dashboard")
  return
}
// ... error handling ...
setDigits(Array(DIGIT_COUNT).fill(""))
focusCell(0)
```

---

### WR-06: `buildR2Key` and `buildOrgLogoR2Key` use `crypto.randomUUID()` from global scope, not `node:crypto`

**File:** `apps/web/src/lib/r2.ts:51-59`

**Issue:** `buildR2Key` and `buildOrgLogoR2Key` call `crypto.randomUUID()` (bare global). `otp.ts` correctly imports `import crypto from "node:crypto"` and uses `crypto.randomInt()`. The bare `crypto` global is available in Node.js 19+ and in Edge runtimes, but the consistency gap is notable. If this module is ever run in an environment where the global `crypto` object is not the Web Crypto API (e.g., certain Jest/JSDOM setups without `--experimental-vm-modules`), the call will throw or silently produce a non-UUID.

**Fix:** Import `crypto` explicitly for consistency:
```typescript
import crypto from "node:crypto"
// ...
export function buildR2Key(orgId: string, filename: string): string {
  const uuid = crypto.randomUUID()
  // ...
}
```

---

## Info

### IN-01: `shouldShow` logic in `getOnboardingChecklistState` has a redundant condition

**File:** `apps/web/src/lib/dashboard-metrics.ts:119`

**Issue:**
```typescript
const shouldShow = (flowCount === 0 && approvalCount === 0) || !allDone
```

When `flowCount === 0 && approvalCount === 0`, `processConfigured` and `firstApproval` are both `false`, so `allDone` is `false`, making `!allDone` already `true`. The first clause `(flowCount === 0 && approvalCount === 0)` is therefore always subsumed by `!allDone` and is dead code. The comment above the expression acknowledges this as a D-10/D-11 literal transcription, but the resulting expression is logically equivalent to `!allDone` alone.

This is not a bug — both expressions produce the same truth table — but the redundant clause adds cognitive load and may mislead future readers into believing there is a meaningful distinction.

**Fix:**
```typescript
// D-11 LITERAL: visible whenever incomplete; hidden only when allDone.
const shouldShow = !allDone
```

---

### IN-02: `ProfileDisplayNameForm` does not wrap the fetch in try/catch

**File:** `apps/web/src/app/(dashboard)/settings/profile/profile-display-name-form.tsx:28-48`

**Issue:** The `handleSubmit` function calls `await fetch(...)` without a try/catch. If the network request throws (e.g., connection refused, browser offline), the unhandled promise rejection will surface as an unhandled error rather than being caught and shown to the user as an error message. The `OrgIdentityForm` component in the same codebase wraps its fetches in try/catch correctly.

**Fix:**
```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  if (isUnchanged || loading) return
  setLoading(true)
  setError("")
  setSuccess(false)

  try {
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) {
      const data = await res.json()
      // ... error handling ...
      return
    }
    setSuccess(true)
    router.refresh()
  } catch {
    setError("Erro ao salvar nome. Tente novamente.")
  } finally {
    setLoading(false)
  }
}
```

---

_Reviewed: 2026-05-02_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
