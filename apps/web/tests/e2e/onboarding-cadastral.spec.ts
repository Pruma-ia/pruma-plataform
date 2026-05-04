/**
 * Playwright spec — CNPJ cadastral gate (proxy.ts) and /onboarding/cadastral page.
 *
 * Covers the ORG-02/ORG-03 enforcement contract:
 *   - New org user (orgCnpjFilled=false) is redirected to /onboarding/cadastral on /dashboard
 *   - /onboarding/cadastral itself is not blocked (no infinite redirect)
 *   - Skip button is absent (mandatory step)
 *   - Filling and submitting the form redirects to /dashboard without looping back
 *
 * Auth strategy: registers a fresh user via POST /api/auth/register in each test
 * (same pattern as email-verification-gate.spec.ts). After registration the user
 * must verify email before the CNPJ gate can fire — so we also verify email via
 * the OTP API (POST /api/test/latest-otp, gated on NODE_ENV !== "production").
 *
 * Screenshots saved under tests/e2e/screenshots/onboarding-cadastral/.
 */

import { test, expect } from "@playwright/test"
import path from "path"
import fs from "fs"

test.describe.configure({ mode: "serial" })

const SHOTS = path.join(__dirname, "screenshots", "onboarding-cadastral")

test.beforeAll(() => {
  fs.mkdirSync(SHOTS, { recursive: true })
})

// ── Helper: register, verify email, sign in ───────────────────────────────────

async function registerVerifiedUser(
  page: Parameters<typeof test>[1] extends (args: { page: infer P }) => unknown ? P : never,
) {
  const ts = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const email = `cadastral-e2e-${ts}@test.pruma`
  const password = "TestPass123!"

  // 1. Register via API
  const res = await page.request.post("/api/auth/register", {
    data: {
      name: "Cadastral E2E Tester",
      email,
      organizationName: `Cadastral E2E Org ${ts}`,
      password,
      acceptedTerms: true,
      marketingConsent: false,
    },
  })
  expect(res.ok(), `Register failed: ${await res.text()}`).toBeTruthy()

  // 2. Sign in
  await page.goto("/login")
  await page.getByLabel(/e-mail/i).fill(email)
  await page.getByLabel(/senha/i).fill(password)
  await page.getByRole("button", { name: /entrar/i }).click()
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 10_000 })

  // 3. Verify email via test OTP endpoint (gated on non-production)
  const otpRes = await page.request.post("/api/test/latest-otp", {
    data: { email },
  })
  if (!otpRes.ok()) {
    test.skip()
    return { email, password }
  }
  const { otp } = await otpRes.json()

  // Navigate to verify-email and enter OTP
  await page.goto("/verify-email")
  await page.waitForLoadState("networkidle")

  // Fill OTP digits — 6 separate inputs or a single input depending on UI
  const otpInputs = page.locator("input[maxlength='1']")
  const count = await otpInputs.count()
  if (count === 6) {
    for (let i = 0; i < 6; i++) {
      await otpInputs.nth(i).fill(otp[i])
    }
  } else {
    const singleInput = page.locator("input[type='text'], input[inputmode='numeric']").first()
    await singleInput.fill(otp)
  }

  // Submit OTP if there is an explicit submit button
  const submitBtn = page.getByRole("button", { name: /verificar|confirmar|continuar/i })
  if (await submitBtn.isVisible()) {
    await submitBtn.click()
  }

  // Wait for redirect away from verify-email
  await page.waitForURL((url) => !url.pathname.startsWith("/verify-email"), { timeout: 10_000 })

  return { email, password }
}

// ── Spec 1: redirect to /onboarding/cadastral when CNPJ is missing ────────────

test("01 — new org user (no CNPJ) is redirected to /onboarding/cadastral when accessing /dashboard", async ({
  page,
}) => {
  await registerVerifiedUser(page)

  await page.goto("/dashboard")
  await page.waitForLoadState("networkidle")

  await expect(page).toHaveURL(/\/onboarding\/cadastral/, { timeout: 8_000 })

  await page.screenshot({
    path: path.join(SHOTS, "01-redirected-to-cadastral.png"),
    fullPage: true,
  })
})

// ── Spec 2: /onboarding/cadastral is directly accessible without looping ──────

test("02 — /onboarding/cadastral is directly accessible and does not redirect again", async ({
  page,
}) => {
  await registerVerifiedUser(page)

  await page.goto("/onboarding/cadastral")
  await page.waitForLoadState("networkidle")

  // Must stay on /onboarding/cadastral (no loop back to itself or elsewhere)
  await expect(page).toHaveURL(/\/onboarding\/cadastral/)

  // Page should render the form — check for CNPJ input presence
  const cnpjInput = page.getByLabel(/cnpj/i)
  await expect(cnpjInput).toBeVisible({ timeout: 8_000 })

  await page.screenshot({
    path: path.join(SHOTS, "02-cadastral-page-renders.png"),
    fullPage: true,
  })
})

// ── Spec 3: skip button is absent (mandatory step) ────────────────────────────

test("03 — skip button is absent on /onboarding/cadastral (mandatory step)", async ({ page }) => {
  await registerVerifiedUser(page)

  await page.goto("/onboarding/cadastral")
  await page.waitForLoadState("networkidle")

  // No skip/pular button must be present
  await expect(page.getByRole("button", { name: /pular|skip/i })).not.toBeVisible()

  await page.screenshot({
    path: path.join(SHOTS, "03-no-skip-button.png"),
    fullPage: true,
  })
})

// ── Spec 4: submit cadastral form → redirected to /dashboard ──────────────────

test("04 — filling and submitting cadastral form redirects to /dashboard", async ({ page }) => {
  await registerVerifiedUser(page)

  await page.goto("/onboarding/cadastral")
  await page.waitForLoadState("networkidle")

  // Fill the 8 cadastral fields
  await page.getByLabel(/cnpj/i).fill("12345678000195")
  await page.getByLabel(/telefone|phone/i).fill("11999990000")
  await page.getByLabel(/logradouro|rua|endere/i).fill("Rua das Flores")
  await page.getByLabel(/número|numero/i).fill("100")

  // Complement is optional — fill only if visible
  const complement = page.getByLabel(/complemento/i)
  if (await complement.isVisible()) {
    await complement.fill("Sala 1")
  }

  await page.getByLabel(/cep|zip|postal/i).fill("01310100")
  await page.getByLabel(/cidade|city/i).fill("São Paulo")
  await page.getByLabel(/estado|state|uf/i).fill("SP")

  await page.screenshot({
    path: path.join(SHOTS, "04a-form-filled.png"),
    fullPage: true,
  })

  // Submit the form
  await page.getByRole("button", { name: /salvar|continuar|enviar|avançar/i }).click()

  // After successful submit → JWT refresh → hard redirect to /dashboard
  await page.waitForURL((url) => url.pathname.startsWith("/dashboard"), { timeout: 15_000 })

  await page.screenshot({
    path: path.join(SHOTS, "04b-after-submit-on-dashboard.png"),
    fullPage: true,
  })

  // Verify on /dashboard and NOT redirected back to cadastral
  await expect(page).toHaveURL(/\/dashboard/)
  expect(page.url()).not.toContain("/onboarding/cadastral")
})
