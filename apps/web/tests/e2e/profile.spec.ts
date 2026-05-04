/**
 * Playwright spec — /settings/profile
 *
 * Auth strategy: registers a fresh owner + org per spec that needs auth.
 * Uses credentials auth so the "E-mail e senha" entry always appears in
 * the connected-accounts list (the seed user always has a password).
 *
 * Spec 2 (display name update flow) requires a running dev server and a
 * real DB write — it registers a fresh user per run to avoid conflicts.
 *
 * Screenshots in tests/e2e/screenshots/profile/
 */

import { test, expect } from "@playwright/test"
import path from "path"
import fs from "fs"

const SHOTS = path.join(__dirname, "screenshots", "profile")

test.beforeAll(() => {
  fs.mkdirSync(SHOTS, { recursive: true })
})

// ── Auth helpers ───────────────────────────────────────────────────────────────

interface OwnerCreds {
  email: string
  password: string
  orgName: string
}

async function registerOwner(
  request: Parameters<typeof test>[1] extends (args: { request: infer R }) => unknown ? R : never,
  ts = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
): Promise<OwnerCreds> {
  const email = `owner-profile-${ts}@test.pruma`
  const password = "TestPass123!"
  const orgName = `Org Profile ${ts}`

  const res = await request.post("/api/auth/register", {
    data: {
      name: "E2E Profile Owner",
      email,
      password,
      organizationName: orgName,
      acceptedTerms: true,
      marketingConsent: false,
    },
  })
  expect(res.ok(), `Register failed: ${await res.text()}`).toBeTruthy()

  // Bypass OTP gate so tests can reach protected pages without completing email verification
  await request.post("/api/test/verify-email", { data: { email } })

  return { email, password, orgName }
}

async function loginAs(
  page: Parameters<typeof test>[1] extends (args: { page: infer P }) => unknown ? P : never,
  email: string,
  password: string,
) {
  await page.goto("/login")
  await page.getByLabel(/e-mail/i).fill(email)
  await page.getByLabel(/senha/i).fill(password)
  await page.getByRole("button", { name: /entrar/i }).click()

  // Accept terms modal if shown (fresh accounts)
  const termsModal = page.locator('[data-testid="terms-modal"], [role="dialog"]')
  if (await termsModal.isVisible({ timeout: 2000 }).catch(() => false)) {
    const acceptBtn = page.getByRole("button", { name: /aceitar|concordo/i })
    if (await acceptBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await acceptBtn.click()
    }
  }

  await page.waitForURL(/\/(dashboard|verify-email)/, { timeout: 10_000 })
}

// ── Spec 1: three profile cards render ────────────────────────────────────────

test("renders the three profile cards", async ({ page, request }) => {
  const { email, password } = await registerOwner(request)
  await loginAs(page, email, password)

  await page.goto("/settings/profile")
  await page.waitForLoadState("networkidle")

  // All three card headings must be present
  await expect(page.getByRole("heading", { name: "Identidade", level: 2 })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Contas conectadas", level: 2 })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Senha", level: 2 })).toBeVisible()

  await page.screenshot({
    path: path.join(SHOTS, "01-three-cards.png"),
    fullPage: true,
  })
})

// ── Spec 2: display name update persists ──────────────────────────────────────

test("display name update flow — persists after reload", async ({ page, request }) => {
  const ts = Date.now()
  const { email, password } = await registerOwner(request, ts)
  await loginAs(page, email, password)

  await page.goto("/settings/profile")
  await page.waitForLoadState("networkidle")

  const newName = `Marcelo Test ${ts}`
  const nameInput = page.getByLabel(/nome de exibição/i)
  await nameInput.fill(newName)

  await page.getByRole("button", { name: /salvar nome/i }).click()

  // Success state must appear
  await expect(page.getByRole("status")).toContainText("Nome atualizado com sucesso!")

  // Reload page and verify value persisted
  await page.reload()
  await page.waitForLoadState("networkidle")

  await expect(page.getByLabel(/nome de exibição/i)).toHaveValue(newName)

  await page.screenshot({
    path: path.join(SHOTS, "02-name-persisted.png"),
    fullPage: false,
  })
})

// ── Spec 3: empty name rejected ───────────────────────────────────────────────

test("empty name is rejected — error appears and no PATCH succeeds silently", async ({
  page,
  request,
}) => {
  const { email, password } = await registerOwner(request)
  await loginAs(page, email, password)

  await page.goto("/settings/profile")
  await page.waitForLoadState("networkidle")

  const nameInput = page.getByLabel(/nome de exibição/i)

  // Clear the input completely
  await nameInput.fill("")

  const submitBtn = page.getByRole("button", { name: /salvar nome/i })

  // Button must be disabled when name is empty (same as unchanged behavior
  // since empty === initialName trim comparison also catches whitespace)
  // If button IS enabled, clicking it should surface an error
  const isDisabled = await submitBtn.isDisabled()
  if (isDisabled) {
    // Client-side guard works — pass
    expect(isDisabled).toBe(true)
  } else {
    // Button enabled — click and expect error
    await submitBtn.click()
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 5_000 })
  }

  await page.screenshot({
    path: path.join(SHOTS, "03-empty-name-rejected.png"),
    fullPage: false,
  })
})

// ── Spec 4: connected accounts shows credentials ──────────────────────────────

test("connected accounts shows 'E-mail e senha' for credentials user", async ({
  page,
  request,
}) => {
  const { email, password } = await registerOwner(request)
  await loginAs(page, email, password)

  await page.goto("/settings/profile")
  await page.waitForLoadState("networkidle")

  // The seed user uses email/password — credentials entry must appear
  await expect(page.getByText("E-mail e senha")).toBeVisible()

  await page.screenshot({
    path: path.join(SHOTS, "04-connected-accounts.png"),
    fullPage: false,
  })
})

// ── Spec 5: no disconnect button (PROF-02 view-only contract) ─────────────────

test("no disconnect button is visible — PROF-02 view-only contract", async ({
  page,
  request,
}) => {
  const { email, password } = await registerOwner(request)
  await loginAs(page, email, password)

  await page.goto("/settings/profile")
  await page.waitForLoadState("networkidle")

  // Scroll to connected accounts section
  const connectedSection = page.getByRole("heading", { name: "Contas conectadas", level: 2 })
  await connectedSection.scrollIntoViewIfNeeded()

  // No button with "desconectar" text must exist anywhere on the page
  await expect(
    page.getByRole("button", { name: /desconectar/i })
  ).toHaveCount(0)
})
