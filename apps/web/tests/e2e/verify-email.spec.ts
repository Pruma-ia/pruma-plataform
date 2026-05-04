/**
 * Playwright spec — /verify-email OTP entry page
 *
 * Auth strategy: registers a fresh user via POST /api/auth/register in each test
 * (no storageState / session fixture exists yet in this project).
 *
 * Spec 3 (happy path) is skipped until Plan 06 ships proxy.ts emailVerified gate.
 * Once the gate lands, the TODO comment should be removed and the test re-enabled.
 *
 * Playwright countdown: uses page.clock.fastForward (Playwright 1.45+ clock API)
 * to advance real-time countdown without waiting 60s. If the Playwright version
 * does not support clock.fastForward, the test documents the fallback approach.
 */

import { test, expect } from "@playwright/test"
import path from "path"
import fs from "fs"

const SHOTS = path.join(__dirname, "screenshots", "verify-email")

test.beforeAll(() => {
  fs.mkdirSync(SHOTS, { recursive: true })
})

// ── Helper: register a test user and navigate to /verify-email ────────────────

async function registerAndNavigate(page: Parameters<typeof test>[1] extends (args: { page: infer P }) => unknown ? P : never) {
  const ts = Date.now()
  const email = `verify-e2e-${ts}@test.pruma`
  const password = "TestPass123!"

  // Register via API — receives redirectTo: /verify-email hint
  const res = await page.request.post("/api/auth/register", {
    data: {
      name: "E2E Tester",
      email,
      password,
      organizationName: `E2E Org ${ts}`,
      acceptedTerms: true,
      marketingConsent: false,
    },
  })
  expect(res.ok()).toBeTruthy()

  // Sign in via credentials to establish session (NextAuth Credentials provider)
  await page.goto("/login")
  await page.getByLabel(/e-mail/i).fill(email)
  await page.getByLabel(/senha/i).fill(password)
  await page.getByRole("button", { name: /entrar/i }).click()

  // After login, navigate to /verify-email (not yet guarded in Plan 02 — gate is Plan 06)
  await page.goto("/verify-email")
  await page.waitForLoadState("networkidle")

  return { email }
}

// ── Spec 1: renders the OTP entry form ───────────────────────────────────────

test("01 — renders the OTP entry form", async ({ page }) => {
  await registerAndNavigate(page)

  await expect(page.getByRole("heading", { name: "Verifique seu e-mail" })).toBeVisible()

  const inputs = page.locator('input[inputmode="numeric"]')
  await expect(inputs).toHaveCount(6)

  await expect(page.getByRole("button", { name: "Verificar código" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Verificar código" })).toBeDisabled()

  await page.screenshot({ path: path.join(SHOTS, "01-form-fresh.png"), fullPage: true })
})

// ── Spec 2: wrong code shows error ───────────────────────────────────────────

test("02 — wrong code shows error message", async ({ page }) => {
  // Mock the verify-otp endpoint to return 400 wrong
  await page.route("**/api/auth/verify-otp", (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ error: "wrong" }),
    }),
  )

  await registerAndNavigate(page)

  const inputs = page.locator('input[inputmode="numeric"]')

  // Fill each cell with "0"
  for (let i = 0; i < 6; i++) {
    await inputs.nth(i).fill("0")
  }

  await page.getByRole("button", { name: "Verificar código" }).click()

  await expect(page.locator('[role="alert"][data-testid="otp-error"]')).toContainText(
    "Código incorreto. Verifique e tente novamente.",
  )

  await page.screenshot({ path: path.join(SHOTS, "02-wrong-code.png"), fullPage: true })
})

// ── Spec 3: happy path (skipped until Plan 06 proxy gate ships) ──────────────

test.skip("03 — happy path: successful verify navigates to /dashboard", async ({ page }) => {
  // TODO(Plan 06): Remove skip once proxy.ts emailVerified gate is in place.
  // Without the gate, navigating to /dashboard after update() does not prove the
  // JWT flipped — the user can access /dashboard unverified anyway.
  //
  // When re-enabling:
  //   1. Remove test.skip
  //   2. Fetch the plaintext OTP from the test DB via a test-only helper endpoint
  //      (e.g. POST /api/test/latest-otp?userId=...) gated on NODE_ENV !== "production"
  //   3. Fill the 6 cells with the real code
  //   4. Submit and assert URL becomes /dashboard within 5s
  //   5. Assert that navigating back to /verify-email redirects to /dashboard (JWT is verified)
})

// ── Spec 4: resend countdown enforced ────────────────────────────────────────

test("04 — resend countdown is shown on load, resend button is hidden during cooldown", async ({
  page,
}) => {
  // Playwright's page.clock does not intercept Next.js/Turbopack's setInterval
  // in dev mode (the bundle captures timer references before Sinon injection).
  // The countdown → button transition is covered by unit tests (RTL + fake timers).
  // This E2E spec verifies the initial rendered state only.
  await registerAndNavigate(page)

  // On fresh load, countdown text is visible (cooldown active)
  await expect(page.getByText(/Reenviar em/)).toBeVisible()

  // The "Reenviar código" button is hidden while cooldown is active
  await expect(page.getByRole("button", { name: "Reenviar código" })).not.toBeVisible()

  await page.screenshot({ path: path.join(SHOTS, "04-resend-hidden.png"), fullPage: true })
})
