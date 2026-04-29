import { test, expect, type Page } from "@playwright/test"
import path from "path"
import fs from "fs"

const SHOTS = path.join(__dirname, "screenshots", "billing-checkout-page")
const PREVIEW = "/billing-preview/checkout"

test.beforeAll(() => {
  fs.mkdirSync(SHOTS, { recursive: true })
})

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOTS, name), fullPage: true })
}

test("01 resumo + formulário — perfil completo, sem setup", async ({ page }) => {
  await page.goto(PREVIEW)
  await expect(page.getByText("Plano Pro")).toBeVisible()
  await expect(page.getByText("R$ 990/mês")).toBeVisible()
  await expect(page.getByLabel(/nome no cartão/i)).toBeVisible()
  await shot(page, "01-form-complete.png")
})

test("02 resumo — com setup charge", async ({ page }) => {
  await page.goto(`${PREVIEW}?setup=1`)
  await expect(page.getByText("Setup inicial")).toBeVisible()
  await expect(page.getByText("R$ 5.000,00")).toBeVisible()
  await expect(page.getByText("em 3x no cartão")).toBeVisible()
  await shot(page, "02-form-with-setup.png")
})

test("03 perfil incompleto — bloqueia formulário", async ({ page }) => {
  await page.goto(`${PREVIEW}?incomplete=1`)
  await expect(page.getByText("Cadastro incompleto")).toBeVisible()
  await expect(page.getByLabel(/nome no cartão/i)).not.toBeVisible()
  await shot(page, "03-profile-incomplete.png")
})

test("04 success — assinatura ativada", async ({ page }) => {
  await page.route("**/api/billing/unified-checkout", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, subscriptionId: "sub_test" }),
    }),
  )
  await page.goto(PREVIEW)
  await page.getByLabel(/nome no cartão/i).fill("JOAO SILVA")
  await page.getByLabel(/número do cartão/i).fill("4111 1111 1111 1111")
  await page.getByLabel(/mês/i).fill("12")
  await page.getByLabel(/ano/i).fill("2027")
  await page.getByLabel(/cvv/i).fill("123")
  await page.getByRole("button", { name: /confirmar e contratar/i }).click()
  await expect(page.getByText("Bem-vindo à Pruma IA")).toBeVisible()
  await shot(page, "04-success.png")
})

test("05 error — falha na cobrança", async ({ page }) => {
  await page.route("**/api/billing/unified-checkout", (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ error: "Dados do cartão inválidos." }),
    }),
  )
  await page.goto(PREVIEW)
  await page.getByLabel(/nome no cartão/i).fill("JOAO SILVA")
  await page.getByLabel(/número do cartão/i).fill("4111 1111 1111 1111")
  await page.getByLabel(/mês/i).fill("12")
  await page.getByLabel(/ano/i).fill("2027")
  await page.getByLabel(/cvv/i).fill("123")
  await page.getByRole("button", { name: /confirmar e contratar/i }).click()
  await expect(page.getByText("Dados do cartão inválidos")).toBeVisible()
  await shot(page, "05-error.png")
})

test("06 validation — campos vazios mostram erro", async ({ page }) => {
  await page.goto(PREVIEW)
  await page.getByRole("button", { name: /confirmar e contratar/i }).click()
  await expect(page.getByText(/preencha todos os dados/i)).toBeVisible()
  await shot(page, "06-validation-error.png")
})
