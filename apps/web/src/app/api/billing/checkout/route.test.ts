import { describe, it, expect, vi, beforeEach } from "vitest"

const mockAuth = vi.fn()
vi.mock("@/lib/auth", () => ({ auth: mockAuth }))

const mockSelect = vi.fn()
const mockUpdate = vi.fn()
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: mockSelect }) }),
    update: () => ({ set: () => ({ where: mockUpdate }) }),
  },
}))

vi.mock("drizzle-orm", () => ({ eq: vi.fn() }))
vi.mock("../../../../../db/schema", () => ({ organizations: {} }))

const mockAsaas = {
  customers: {
    find: vi.fn(),
    create: vi.fn(),
  },
  subscriptions: {
    create: vi.fn(),
  },
  paymentLinks: {
    create: vi.fn(),
  },
}
vi.mock("@/lib/asaas", () => ({ asaas: mockAsaas }))

function makeRequest(body: object, extraHeaders?: Record<string, string>) {
  return new Request("http://localhost/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...extraHeaders },
    body: JSON.stringify(body),
  })
}

const session = { user: { id: "u1", email: "owner@test.com", organizationId: "org-1" } }
const org = { id: "org-1", name: "Acme", asaasCustomerId: null }
const validBody = { planId: "starter", billingType: "PIX" }

describe("POST /api/billing/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(session)
    mockSelect.mockResolvedValue([org])
    mockUpdate.mockResolvedValue([])
    mockAsaas.customers.find.mockResolvedValue({ data: [] })
    mockAsaas.customers.create.mockResolvedValue({ id: "cus_new" })
    mockAsaas.paymentLinks.create.mockResolvedValue({ url: "https://asaas.com/pay/link" })
    mockAsaas.subscriptions.create.mockResolvedValue({ id: "sub_new" })
  })

  it("retorna 401 sem sessão", async () => {
    mockAuth.mockResolvedValue(null)
    const { POST } = await import("./route")
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(401)
  })

  it("retorna 401 sem organizationId", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } })
    const { POST } = await import("./route")
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(401)
  })

  it("retorna 400 para planId inválido", async () => {
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ planId: "ultra" }))
    expect(res.status).toBe(400)
  })

  it("retorna 404 quando org não encontrada", async () => {
    mockSelect.mockResolvedValue([])
    const { POST } = await import("./route")
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(404)
  })

  it("cria customer novo quando asaasCustomerId é null e nenhum customer existe", async () => {
    mockAsaas.customers.find.mockResolvedValue({ data: [] })
    const { POST } = await import("./route")
    await POST(makeRequest(validBody))
    expect(mockAsaas.customers.create).toHaveBeenCalledWith({
      name: "Acme",
      email: "owner@test.com",
      cpfCnpj: undefined,
    })
  })

  it("reutiliza customer existente no Asaas quando encontrado por email", async () => {
    mockAsaas.customers.find.mockResolvedValue({ data: [{ id: "cus_existing" }] })
    const { POST } = await import("./route")
    await POST(makeRequest(validBody))
    expect(mockAsaas.customers.create).not.toHaveBeenCalled()
  })

  it("usa asaasCustomerId existente sem chamar Asaas", async () => {
    mockSelect.mockResolvedValue([{ ...org, asaasCustomerId: "cus_stored" }])
    const { POST } = await import("./route")
    await POST(makeRequest(validBody))
    expect(mockAsaas.customers.find).not.toHaveBeenCalled()
    expect(mockAsaas.customers.create).not.toHaveBeenCalled()
  })

  it("retorna payment link quando sem creditCard", async () => {
    const { POST } = await import("./route")
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.url).toContain("asaas.com")
    expect(mockAsaas.paymentLinks.create).toHaveBeenCalled()
  })

  it("lê remoteIp do header x-forwarded-for quando presente", async () => {
    const { POST } = await import("./route")
    const res = await POST(makeRequest(validBody, { "x-forwarded-for": "203.0.113.1, 10.0.0.1" }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.url).toContain("asaas.com")
  })

  it("cria assinatura direta quando creditCard e holderInfo fornecidos", async () => {
    const body = {
      planId: "pro",
      billingType: "CREDIT_CARD",
      creditCard: { holderName: "João", number: "1234567890123456", expiryMonth: "12", expiryYear: "2027", ccv: "123" },
      holderInfo: { name: "João Silva", email: "joao@test.com", cpfCnpj: "12345678900", postalCode: "01310-100", addressNumber: "1000" },
    }
    const { POST } = await import("./route")
    const res = await POST(makeRequest(body))
    expect(res.status).toBe(200)
    const resBody = await res.json()
    expect(resBody.ok).toBe(true)
    expect(resBody.subscriptionId).toBe("sub_new")
    expect(mockAsaas.subscriptions.create).toHaveBeenCalled()
  })
})
