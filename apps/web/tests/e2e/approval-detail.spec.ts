/**
 * Playwright spec — /approvals/[id] — Timeline de auditoria
 *
 * Verifies that the "Histórico de decisão" section renders correctly
 * after plan 02-03 adds ApprovalTimeline to the approval detail page.
 *
 * Auth strategy: registers a fresh owner + org per test run via API.
 * Approval created via n8n webhook API (same pattern as integration tests).
 *
 * Screenshots in tests/e2e/screenshots/approval-detail/
 */

import { test, expect } from "@playwright/test"
import path from "path"
import fs from "fs"

const SHOTS = path.join(__dirname, "screenshots", "approval-detail")
const N8N_SECRET = process.env.N8N_WEBHOOK_SECRET ?? "dev-n8n-secret"

test.beforeAll(() => {
  fs.mkdirSync(SHOTS, { recursive: true })
})

// ── Auth helpers ──────────────────────────────────────────────────────────────

interface OwnerCreds {
  email: string
  password: string
  orgSlug: string
}

async function registerOwner(
  request: Parameters<typeof test>[1] extends (args: { request: infer R }) => unknown ? R : never,
  ts: string,
): Promise<OwnerCreds> {
  const email = `owner-detail-${ts}@test.pruma`
  const password = "TestPass123!"
  const orgName = `Org Detail ${ts}`
  const orgSlug = orgName.toLowerCase().replace(/\s+/g, "-")

  const res = await request.post("/api/auth/register", {
    data: {
      name: "E2E Owner",
      email,
      password,
      organizationName: orgName,
      acceptedTerms: true,
      marketingConsent: false,
    },
  })
  expect(res.ok(), `Register failed: ${await res.text()}`).toBeTruthy()

  // Bypass OTP gate so tests can reach protected pages
  await request.post("/api/test/verify-email", { data: { email } })

  return { email, password, orgSlug }
}

async function loginAs(
  page: Parameters<typeof test>[1] extends (args: { page: infer P }) => unknown ? P : never,
  email: string,
  password: string,
) {
  await page.goto("/login")
  await page.getByLabel(/e-?mail/i).fill(email)
  await page.getByLabel(/senha/i).fill(password)
  await page.getByRole("button", { name: /entrar/i }).click()
  await page.waitForURL(/\/dashboard|\/approvals|\/onboarding/, { timeout: 10_000 })

  // New users hit the CNPJ cadastral gate — fill via positional inputs (form has no id/name attrs)
  if (page.url().includes("/onboarding/cadastral")) {
    const inputs = page.locator("input")
    await inputs.nth(0).fill("11222333000181") // CNPJ
    await inputs.nth(1).fill("11999990000")    // Telefone
    await inputs.nth(2).fill("01310100")       // CEP
    await page.waitForTimeout(1500)            // wait for CEP auto-fill via ViaCEP
    await inputs.nth(3).fill("Av. Paulista")   // Rua
    await inputs.nth(4).fill("1000")           // Número
    await inputs.nth(6).fill("São Paulo")      // Cidade (idx 5 = Complemento, optional)
    await inputs.nth(7).fill("SP")             // UF
    await page.getByRole("button", { name: /salvar|continuar|próximo/i }).click()
    await page.waitForURL(/\/dashboard|\/approvals/, { timeout: 15_000 })
  }
}

// ── Approval creation helper ──────────────────────────────────────────────────

async function createApproval(
  request: Parameters<typeof test>[1] extends (args: { request: infer R }) => unknown ? R : never,
  orgSlug: string,
  execId: string,
) {
  const res = await request.post("/api/n8n/approvals", {
    headers: { "x-n8n-secret": N8N_SECRET },
    data: {
      organizationSlug: orgSlug,
      n8nExecutionId: execId,
      callbackUrl: "https://n8n.callback.test/webhook/e2e-detail",
      title: "Aprovação E2E — timeline test",
      description: "Teste do histórico de decisão",
    },
  })
  const body = await res.json()
  return body.approvalId as string
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

test("timeline section is visible with at least one event row on approval detail page", async ({
  page,
  request,
}) => {
  const ts = `${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
  const { email, password, orgSlug } = await registerOwner(request, ts)

  const approvalId = await createApproval(request, orgSlug, `exec-e2e-timeline-${ts}`)
  expect(approvalId).toBeTruthy()

  await loginAs(page, email, password)
  await page.goto(`/approvals/${approvalId}`)

  // Timeline header must be visible
  await expect(page.getByText("Histórico de decisão", { exact: true })).toBeVisible({ timeout: 10_000 })

  // At least one event list item rendered (approval_created from n8n webhook)
  const eventItems = page.locator("ol li")
  await expect(eventItems.first()).toBeVisible({ timeout: 5_000 })

  await page.screenshot({ path: path.join(SHOTS, "timeline-visible.png"), fullPage: true })
})

test("approval_viewed event label is visible after page reload", async ({
  page,
  request,
}) => {
  const ts = `${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
  const { email, password, orgSlug } = await registerOwner(request, ts)

  const approvalId = await createApproval(request, orgSlug, `exec-e2e-viewed-${ts}`)
  expect(approvalId).toBeTruthy()

  await loginAs(page, email, password)

  // First visit — page renders and fires approval_viewed insert (fire-and-forget)
  await page.goto(`/approvals/${approvalId}`)
  await expect(page.getByText("Histórico de decisão", { exact: true })).toBeVisible({ timeout: 10_000 })

  // Reload to ensure approval_viewed event is now persisted and rendered
  await page.reload()
  await expect(page.getByText("Histórico de decisão", { exact: true })).toBeVisible({ timeout: 10_000 })

  // "Aprovação visualizada" label should appear (from the first visit's view event)
  await expect(page.getByText("Aprovação visualizada").first()).toBeVisible({ timeout: 12_000 })

  await page.screenshot({ path: path.join(SHOTS, "approval-viewed-event.png"), fullPage: true })
})
