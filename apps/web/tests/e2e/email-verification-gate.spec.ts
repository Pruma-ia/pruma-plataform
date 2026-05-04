/**
 * Playwright spec — emailVerified gate (proxy.ts)
 *
 * Covers the AUTH-01 enforcement contract implemented in Plan 06:
 *   - Unverified users with org are redirected to /verify-email on guarded routes
 *   - /verify-email itself is not blocked (no infinite redirect loop)
 *   - OTP API endpoints are reachable while unverified
 *   - After successful OTP verification, /dashboard becomes accessible
 *   - Verified users visiting /verify-email are bounced to /dashboard
 *   - No session (unauthenticated) — no gate fires
 *
 * Auth strategy: registers a fresh user via POST /api/auth/register in each
 * test/fixture (same pattern as verify-email.spec.ts — no storageState yet).
 *
 * OTP retrieval for happy-path spec: uses POST /api/test/latest-otp endpoint
 * gated on NODE_ENV !== "production". If not available (production build),
 * the spec is skipped with a clear message.
 *
 * Screenshots are saved under tests/e2e/screenshots/email-verification-gate/.
 */

import { test, expect } from "@playwright/test"
import path from "path"
import fs from "fs"

// Auth-flow tests share the same server state — run serially to avoid
// concurrent registration race conditions (slug uniqueness, DB contention).
test.describe.configure({ mode: "serial" })

const SHOTS = path.join(__dirname, "screenshots", "email-verification-gate")

test.beforeAll(() => {
  fs.mkdirSync(SHOTS, { recursive: true })
})

// ── Helper: register a fresh unverified user and sign in ──────────────────────

async function registerUnverified(
  page: Parameters<typeof test>[1] extends (args: { page: infer P }) => unknown ? P : never,
) {
  const ts = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const email = `gate-e2e-${ts}@test.pruma`
  const password = "TestPass123!"

  // 1. Register via API — creates user + org + generates OTP
  const res = await page.request.post("/api/auth/register", {
    data: {
      name: "Gate E2E Tester",
      email,
      organizationName: `Gate E2E Org ${ts}`,
      password,
      acceptedTerms: true,
      marketingConsent: false,
    },
  })
  expect(res.ok(), `Register failed: ${await res.text()}`).toBeTruthy()

  // 2. Sign in to establish session (user has org, emailVerified=null → gate active)
  await page.goto("/login")
  await page.getByLabel(/e-mail/i).fill(email)
  await page.getByLabel(/senha/i).fill(password)
  await page.getByRole("button", { name: /entrar/i }).click()

  // Wait for navigation after login (should redirect to /onboarding or /dashboard)
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 10_000 })

  return { email, password }
}

// ── Spec 1: unverified user is redirected to /verify-email ───────────────────

test("01 — unverified user is redirected to /verify-email when accessing /dashboard", async ({
  page,
}) => {
  await registerUnverified(page)

  // Navigate to a guarded route
  await page.goto("/dashboard")
  await page.waitForLoadState("networkidle")

  // Gate should redirect to /verify-email
  expect(page.url()).toContain("/verify-email")

  await page.screenshot({
    path: path.join(SHOTS, "01-gate-redirect.png"),
    fullPage: true,
  })
})

// ── Spec 2: /verify-email is reachable while unverified ──────────────────────

test("02 — /verify-email is reachable while unverified (no redirect loop)", async ({ page }) => {
  await registerUnverified(page)

  // Navigate directly to /verify-email
  await page.goto("/verify-email")
  await page.waitForLoadState("networkidle")

  // URL must stay at /verify-email (no redirect loop)
  expect(page.url()).toContain("/verify-email")

  // Page heading must be visible
  await expect(page.getByRole("heading", { name: "Verifique seu e-mail" })).toBeVisible()

  await page.screenshot({
    path: path.join(SHOTS, "02-verify-email-accessible.png"),
    fullPage: true,
  })
})

// ── Spec 3: OTP endpoints are reachable while unverified ─────────────────────

test("03 — OTP API endpoints are reachable while unverified (no 3xx redirect)", async ({
  page,
}) => {
  await registerUnverified(page)

  // Navigate to /verify-email first to establish session cookie context in browser
  await page.goto("/verify-email")
  await page.waitForLoadState("networkidle")

  // POST /api/auth/resend-otp while authenticated but unverified
  // Acceptable responses: 200 (resent) or 429 (cooldown from initial OTP in register)
  // What's NOT acceptable: a 3xx redirect to /verify-email
  const res = await page.request.post("/api/auth/resend-otp")

  // 200 = resent, 429 = cooldown from OTP created at registration — both acceptable.
  // A 3xx would mean the route is behind the email gate, which is the bug being tested.
  expect([200, 429]).toContain(res.status())

  await page.screenshot({
    path: path.join(SHOTS, "03-otp-endpoints-reachable.png"),
    fullPage: true,
  })
})

// ── Spec 4: after verify, /dashboard becomes reachable ───────────────────────

test("04 — after OTP verification, /dashboard is accessible (gate lifted)", async ({ page }) => {
  // This spec requires the test-only endpoint POST /api/test/latest-otp.
  // If not available (missing in build), skip with a clear message.
  const testOtpEndpoint = "/api/test/latest-otp"

  const { email } = await registerUnverified(page)

  // Navigate to /verify-email — gate should have redirected here already
  await page.goto("/dashboard")
  await page.waitForURL((url) => url.pathname.includes("/verify-email"), { timeout: 10_000 })

  // Fetch the plaintext OTP from the test-only endpoint
  const otpRes = await page.request.post(testOtpEndpoint, {
    data: { email },
    failOnStatusCode: false,
  })

  if (otpRes.status() === 404) {
    test.skip() // Test helper endpoint not available in this build
    return
  }

  expect(otpRes.ok(), `Failed to get test OTP: ${await otpRes.text()}`).toBeTruthy()
  const { code } = await otpRes.json()
  expect(typeof code).toBe("string")
  expect(code).toHaveLength(6)

  // Fill the OTP cells on the /verify-email page
  const inputs = page.locator('input[inputmode="numeric"]')
  await expect(inputs).toHaveCount(6)
  for (let i = 0; i < 6; i++) {
    await inputs.nth(i).fill(code[i])
  }

  // Submit the form
  await page.getByRole("button", { name: "Verificar código" }).click()

  // Wait for redirect to /dashboard after successful verification
  await page.waitForURL((url) => url.pathname.startsWith("/dashboard"), { timeout: 10_000 })

  // Assert: we are on /dashboard, not /verify-email
  expect(page.url()).toContain("/dashboard")
  expect(page.url()).not.toContain("/verify-email")

  // Assert: navigating back to /verify-email now bounces to /dashboard (JWT updated)
  await page.goto("/verify-email")
  await page.waitForURL((url) => url.pathname.startsWith("/dashboard"), { timeout: 5_000 })
  expect(page.url()).toContain("/dashboard")

  await page.screenshot({
    path: path.join(SHOTS, "04-post-verify-dashboard.png"),
    fullPage: true,
  })
})

// ── Spec 5: verified user visiting /verify-email is bounced to /dashboard ─────

test("05 — verified user visiting /verify-email is redirected to /dashboard", async ({ page }) => {
  // This spec needs a user with emailVerified set.
  // Strategy: same register-then-verify flow as spec 4, then re-test /verify-email.

  const testOtpEndpoint = "/api/test/latest-otp"
  const { email } = await registerUnverified(page)

  // Gate redirects to /verify-email
  await page.goto("/dashboard")
  await page.waitForURL((url) => url.pathname.includes("/verify-email"), { timeout: 10_000 })

  // Get the OTP
  const otpRes = await page.request.post(testOtpEndpoint, {
    data: { email },
    failOnStatusCode: false,
  })

  if (otpRes.status() === 404) {
    test.skip()
    return
  }

  const { code } = await otpRes.json()

  // Fill and submit
  const inputs = page.locator('input[inputmode="numeric"]')
  await expect(inputs).toHaveCount(6)
  for (let i = 0; i < 6; i++) {
    await inputs.nth(i).fill(code[i])
  }
  await page.getByRole("button", { name: "Verificar código" }).click()
  await page.waitForURL((url) => url.pathname.startsWith("/dashboard"), { timeout: 10_000 })

  // Now navigate to /verify-email as a verified user — proxy should bounce to /dashboard
  await page.goto("/verify-email")
  await page.waitForURL((url) => url.pathname.startsWith("/dashboard"), { timeout: 5_000 })

  expect(page.url()).toContain("/dashboard")

  await page.screenshot({
    path: path.join(SHOTS, "05-verified-bounced-from-verify-email.png"),
    fullPage: true,
  })
})

// ── Spec 6: no session → no gate, no 500 ─────────────────────────────────────

test("06 — unauthenticated user visiting /verify-email does not 500 or loop", async ({ page }) => {
  // No login — just navigate directly
  const res = await page.goto("/verify-email", { waitUntil: "networkidle" })

  // Should get a valid response (200 or redirect to /login) — never 500
  // The emailVerified gate does NOT trigger without a session
  const finalStatus = res?.status() ?? 200
  expect(finalStatus).not.toBe(500)

  // URL should be /verify-email or /login (redirected by NextAuth's signIn page config)
  // but NEVER looping back
  const finalUrl = page.url()
  expect(finalUrl).not.toMatch(/verify-email.*verify-email/)

  await page.screenshot({
    path: path.join(SHOTS, "06-no-session-no-gate.png"),
    fullPage: true,
  })
})
