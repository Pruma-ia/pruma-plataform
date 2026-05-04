/**
 * Playwright E2E spec — /approvals filter, search, and CSV export.
 *
 * Covers the plan's acceptance criteria:
 *   - Filter by status pill → URL updates to ?status=..., table re-renders
 *   - Search debounce → type in search bar → URL updates to ?q=... after 300ms
 *   - "Exportar CSV" button → click triggers download
 *
 * Auth strategy: these tests require an authenticated session. They are designed
 * to be run manually with a dev server (`npm run dev`) where the tester is already
 * signed in, OR via a storage-state auth file if one is configured for CI.
 *
 * If no auth state is available the tests will redirect to /login and be skipped
 * gracefully via the skipIfUnauthenticated check.
 *
 * Screenshots saved under tests/e2e/screenshots/approvals/.
 */

import { test, expect } from "@playwright/test"
import path from "path"
import fs from "fs"

test.describe.configure({ mode: "serial" })

const SHOTS = path.join(__dirname, "screenshots", "approvals")

test.beforeAll(() => {
  fs.mkdirSync(SHOTS, { recursive: true })
})

// ── Helper: navigate to /approvals and return false if redirected to auth ─────

async function goToApprovals(page: Parameters<Parameters<typeof test>[1]>[0]["page"]) {
  await page.goto("/approvals")
  const url = page.url()
  return (
    !url.includes("/login") &&
    !url.includes("/verify-email") &&
    !url.includes("/onboarding")
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test("filter by status pill updates URL to ?status=pending", async ({ page }) => {
  const ok = await goToApprovals(page)
  if (!ok) {
    test.skip(true, "Not authenticated — skipping approvals E2E test")
    return
  }

  await page.screenshot({ path: path.join(SHOTS, "01-initial.png") })

  // Click the "Pendentes" status pill link
  await page.getByRole("link", { name: /Pendentes/ }).click()

  // URL must now contain status=pending
  await expect(page).toHaveURL(/status=pending/)

  await page.screenshot({ path: path.join(SHOTS, "02-pending-filter.png") })
})

test("search debounce: typing updates URL to ?q= after 300ms", async ({ page }) => {
  const ok = await goToApprovals(page)
  if (!ok) {
    test.skip(true, "Not authenticated — skipping approvals E2E test")
    return
  }

  const searchInput = page.getByLabel("Buscar aprovações")
  await expect(searchInput).toBeVisible()

  await searchInput.fill("contrato")

  // Wait for debounce (300ms) + navigation — allow up to 2s
  await page.waitForURL(/q=contrato/, { timeout: 2000 })

  expect(page.url()).toContain("q=contrato")

  await page.screenshot({ path: path.join(SHOTS, "03-search-debounce.png") })
})

test("Exportar CSV button triggers file download", async ({ page }) => {
  const ok = await goToApprovals(page)
  if (!ok) {
    test.skip(true, "Not authenticated — skipping approvals E2E test")
    return
  }

  // Wait for page to settle and export link to appear
  const exportLink = page.getByRole("link", { name: /Exportar CSV/ }).first()
  await expect(exportLink).toBeVisible()

  // Capture download event before clicking
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 5000 }),
    exportLink.click(),
  ])

  // Verify the download has a CSV filename
  const filename = download.suggestedFilename()
  expect(filename).toMatch(/aprovacoes-.*\.csv/)

  await page.screenshot({ path: path.join(SHOTS, "04-after-export.png") })
})
