import { test, type Page } from "@playwright/test"
import path from "path"
import fs from "fs"

const SHOTS = path.join(__dirname, "screenshots", "billing-checkout")
const PREVIEW = "/billing-preview"

test.beforeAll(() => {
  fs.mkdirSync(SHOTS, { recursive: true })
})

async function shot(page: Page, name: string) {
  const modal = page.locator(".rounded-2xl.bg-white.shadow-xl")
  await modal.waitFor({ state: "visible" })
  await modal.screenshot({ path: path.join(SHOTS, name) })
}

test("01 card-form — perfil completo", async ({ page }) => {
  await page.goto(PREVIEW)
  await shot(page, "01-card-form.png")
})

test("02 card-form — perfil incompleto (blocker)", async ({ page }) => {
  await page.goto(`${PREVIEW}?incomplete=1`)
  await shot(page, "02-profile-incomplete.png")
})

test("03 success — cartão aprovado", async ({ page }) => {
  await page.route("**/api/billing/checkout", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, subscriptionId: "sub_test" }),
    }),
  )
  await page.goto(PREVIEW)
  await page.locator("#holderName").fill("JOAO SILVA")
  await page.locator("#cardNumber").fill("4111 1111 1111 1111")
  await page.locator("#expiryMonth").fill("12")
  await page.locator("#expiryYear").fill("2027")
  await page.locator("#ccv").fill("123")
  await page.getByRole("button", { name: "Confirmar assinatura" }).click()
  await page.waitForFunction(() =>
    document.body.innerText.includes("Assinatura ativada"),
  )
  await shot(page, "03-success.png")
})

test("04 error — falha na cobrança", async ({ page }) => {
  await page.route("**/api/billing/checkout", (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ error: "Dados do cartão inválidos." }),
    }),
  )
  await page.goto(PREVIEW)
  await page.locator("#holderName").fill("JOAO SILVA")
  await page.locator("#cardNumber").fill("4111 1111 1111 1111")
  await page.locator("#expiryMonth").fill("12")
  await page.locator("#expiryYear").fill("2027")
  await page.locator("#ccv").fill("123")
  await page.getByRole("button", { name: "Confirmar assinatura" }).click()
  await page.waitForFunction(() =>
    document.body.innerText.includes("Dados do cartão inválidos"),
  )
  await shot(page, "04-error.png")
})

test("05 validation — campos vazios mostram erro", async ({ page }) => {
  await page.goto(PREVIEW)
  await page.getByRole("button", { name: "Confirmar assinatura" }).click()
  await page.waitForFunction(() =>
    document.body.innerText.includes("Preencha todos os dados"),
  )
  await shot(page, "05-validation-error.png")
})
