import { describe, it, expect, vi, beforeEach } from "vitest"

function mockFetch(body: unknown, ok = true, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  })
}

describe("asaas client", () => {
  beforeEach(() => {
    process.env.ASAAS_API_URL = "https://sandbox.asaas.com/api/v3"
    process.env.ASAAS_API_KEY = "test-key"
    vi.resetModules()
  })

  it("customers.create sends POST /customers with access_token header", async () => {
    mockFetch({ id: "cus_1", name: "Acme", email: "acme@test.com" })
    const { asaas } = await import("./asaas")
    const result = await asaas.customers.create({ name: "Acme", email: "acme@test.com" })
    expect(result.id).toBe("cus_1")
    const [url, opts] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toContain("/customers")
    expect(opts.method).toBe("POST")
    expect(opts.headers.access_token).toBe("test-key")
  })

  it("customers.find sends GET /customers?email=... (URL-encoded)", async () => {
    mockFetch({ data: [] })
    const { asaas } = await import("./asaas")
    await asaas.customers.find("user@test.com")
    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toContain("/customers?email=user%40test.com")
  })

  it("subscriptions.get sends GET /subscriptions/{id}", async () => {
    mockFetch({ id: "sub_1", status: "ACTIVE" })
    const { asaas } = await import("./asaas")
    await asaas.subscriptions.get("sub_1")
    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toContain("/subscriptions/sub_1")
  })

  it("subscriptions.cancel sends DELETE /subscriptions/{id}", async () => {
    mockFetch({})
    const { asaas } = await import("./asaas")
    await asaas.subscriptions.cancel("sub_1")
    const [url, opts] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toContain("/subscriptions/sub_1")
    expect(opts.method).toBe("DELETE")
  })

  it("subscriptions.create sends POST /subscriptions", async () => {
    mockFetch({ id: "sub_new" })
    const { asaas } = await import("./asaas")
    await asaas.subscriptions.create({
      customer: "cus_1",
      billingType: "BOLETO",
      value: 97,
      nextDueDate: "2026-05-01",
      cycle: "MONTHLY",
    })
    const [url, opts] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toContain("/subscriptions")
    expect(opts.method).toBe("POST")
  })

  it("payments.list sends GET /payments?subscription=... (URL-encoded)", async () => {
    mockFetch({ data: [{ id: "pay_1", billingType: "PIX" }] })
    const { asaas } = await import("./asaas")
    const result = await asaas.payments.list("sub_1")
    expect(result.data[0].id).toBe("pay_1")
    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toContain("/payments?subscription=sub_1")
  })

  it("throws on non-ok response with status code", async () => {
    mockFetch({ errors: [{ description: "Bad request" }] }, false, 400)
    const { asaas } = await import("./asaas")
    await expect(asaas.customers.find("bad@test.com")).rejects.toThrow("Asaas API error 400")
  })

  it("usa URL fallback quando ASAAS_API_URL não configurado (cobre branch ?? linha 1)", async () => {
    delete process.env.ASAAS_API_URL
    mockFetch({ id: "cus_1", name: "Acme", email: "acme@test.com" })
    const { asaas } = await import("./asaas")
    await asaas.customers.create({ name: "Acme", email: "acme@test.com" })
    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toContain("sandbox.asaas.com")
  })

  it("throws when json parse fails on error response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => { throw new Error("parse fail") },
    })
    const { asaas } = await import("./asaas")
    await expect(asaas.customers.find("x@test.com")).rejects.toThrow("Asaas API error 500")
  })

  it("webhooks.register sends POST /webhooks with correct payload", async () => {
    mockFetch({ id: "wh_1" })
    const { asaas } = await import("./asaas")
    await asaas.webhooks.register({
      url: "https://app.test/api/webhooks/asaas",
      email: "admin@test.com",
      authToken: "a".repeat(32),
    })
    const [url, opts] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toContain("/webhooks")
    expect(opts.method).toBe("POST")
    const body = JSON.parse(opts.body)
    expect(body.url).toBe("https://app.test/api/webhooks/asaas")
    expect(body.sendType).toBe("SEQUENTIALLY")
    expect(body.name).toBe("Pruma IA")
    expect(body.apiVersion).toBe(3)
    expect(Array.isArray(body.events)).toBe(true)
  })

  it("webhooks.register usa events customizados quando fornecidos", async () => {
    mockFetch({ id: "wh_1" })
    const { asaas } = await import("./asaas")
    await asaas.webhooks.register({
      url: "https://app.test/api/webhooks/asaas",
      email: "admin@test.com",
      authToken: "a".repeat(32),
      events: ["PAYMENT_CONFIRMED"],
    })
    const [, opts] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse(opts.body)
    expect(body.events).toEqual(["PAYMENT_CONFIRMED"])
  })

  it("webhooks.list sends GET /webhooks", async () => {
    mockFetch({ data: [] })
    const { asaas } = await import("./asaas")
    await asaas.webhooks.list()
    const [url, opts] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toContain("/webhooks")
    expect(opts?.method).toBeUndefined()
  })

  // ── updateAsaasCustomer tests (ORG-04) ──────────────────────────────────────

  it("updateAsaasCustomer issues PUT to /customers/{id} with correct body (ORG-04)", async () => {
    mockFetch({ id: "cus_1", cpfCnpj: "12345678000195" })
    const { updateAsaasCustomer } = await import("./asaas")
    const result = await updateAsaasCustomer("cus_1", {
      cnpj: "12345678000195",
      phone: "11999990000",
      addressStreet: "Rua Exemplo",
      addressNumber: "100",
      addressComplement: "Sala 1",
      addressZipCode: "01310100",
      addressCity: "São Paulo",
      addressState: "SP",
    })
    expect(result.ok).toBe(true)
    const [url, opts] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toContain("/customers/cus_1")
    expect(opts.method).toBe("PUT")
    const body = JSON.parse(opts.body)
    expect(body.cpfCnpj).toBe("12345678000195")
    expect(body.city).toBe("São Paulo")
    expect(body.province).toBe("SP")
  })

  it("updateAsaasCustomer returns ok:false (no throw) when fetch fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network failure"))
    const { updateAsaasCustomer } = await import("./asaas")
    const result = await updateAsaasCustomer("cus_1", {
      cnpj: "12345678000195",
      phone: null,
      addressStreet: null,
      addressNumber: null,
      addressComplement: null,
      addressZipCode: null,
      addressCity: null,
      addressState: null,
    })
    expect(result.ok).toBe(false)
    expect(result.error).toBeDefined()
  })

  it("updateAsaasCustomer returns ok:false when response status is not 2xx", async () => {
    mockFetch({ errors: [{ description: "Customer not found" }] }, false, 404)
    const { updateAsaasCustomer } = await import("./asaas")
    const result = await updateAsaasCustomer("cus_unknown", {
      cnpj: "12345678000195",
      phone: null,
      addressStreet: null,
      addressNumber: null,
      addressComplement: null,
      addressZipCode: null,
      addressCity: null,
      addressState: null,
    })
    expect(result.ok).toBe(false)
    expect(result.error).toBeDefined()
  })

  it("updateAsaasCustomer returns ok:false with descriptive error when ASAAS_API_KEY missing", async () => {
    delete process.env.ASAAS_API_KEY
    mockFetch({})
    const { updateAsaasCustomer } = await import("./asaas")
    const result = await updateAsaasCustomer("cus_1", {
      cnpj: "12345678000195",
      phone: null,
      addressStreet: null,
      addressNumber: null,
      addressComplement: null,
      addressZipCode: null,
      addressCity: null,
      addressState: null,
    })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/ASAAS_API_KEY/i)
  })

  it("payments.create sends POST /payments with body", async () => {
    mockFetch({ id: "pay_1", installmentCount: 3 })
    const { asaas } = await import("./asaas")
    const result = await asaas.payments.create({
      customer: "cus_1",
      billingType: "CREDIT_CARD",
      value: 5000,
      dueDate: "2026-04-29",
      installmentCount: 3,
      installmentValue: 1666.67,
      creditCard: {},
      creditCardHolderInfo: {},
    })
    expect(result.id).toBe("pay_1")
    const [url, opts] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toContain("/payments")
    expect(opts.method).toBe("POST")
    const body = JSON.parse(opts.body)
    expect(body.value).toBe(5000)
    expect(body.installmentCount).toBe(3)
  })
})
