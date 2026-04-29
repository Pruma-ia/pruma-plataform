import { test, expect } from "@playwright/test"
import path from "path"

const sections = [
  { name: "index", path: "/design-preview" },
  { name: "colors", path: "/design-preview/colors" },
  { name: "typography", path: "/design-preview/typography" },
  { name: "buttons", path: "/design-preview/buttons" },
  { name: "badges", path: "/design-preview/badges" },
  { name: "inputs", path: "/design-preview/inputs" },
  { name: "cards", path: "/design-preview/cards" },
  { name: "tables", path: "/design-preview/tables" },
  { name: "modals", path: "/design-preview/modals" },
  { name: "empty-states", path: "/design-preview/empty-states" },
  { name: "loading", path: "/design-preview/loading" },
  { name: "navigation", path: "/design-preview/navigation" },
  { name: "crud", path: "/design-preview/crud" },
]

const screenshotDir = path.join("tests/e2e/screenshots/design-preview")

test.describe("Design Preview — capturas de referência visual", () => {
  for (const section of sections) {
    test(`captura: ${section.name}`, async ({ page }) => {
      await page.goto(section.path)
      await page.waitForLoadState("networkidle")

      // Aguarda animações de esqueleto (pulse) antes do screenshot
      await page.waitForTimeout(300)

      await page.screenshot({
        path: `${screenshotDir}/${section.name}.png`,
        fullPage: true,
      })

      // Verifica que a página renderizou sem erro
      await expect(page.locator("main")).toBeVisible()
    })
  }
})

test("design-preview: sidebar navegável", async ({ page }) => {
  await page.goto("/design-preview")

  // Verifica links de navegação existem
  for (const section of sections.slice(1)) {
    const link = page.locator(`a[href="${section.path}"]`)
    await expect(link).toBeVisible()
  }
})
