import { describe, it, expect, vi, beforeEach } from "vitest"

const mockAuth = vi.fn()
vi.mock("@/lib/auth", () => ({ auth: mockAuth }))

const mockSelect = vi.fn()
const mockSet = vi.fn()
const mockUpdate = vi.fn()
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: mockSelect }) }),
    update: () => ({ set: mockSet }),
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
  payments: {
    list: vi.fn(),
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
const org = {
  id: "org-1",
  name: "Acme",
  asaasCustomerId: null,
  cnpj: "12345678000195",
  addressZipCode: "01310100",
  addressNumber: "1000",
  phone: null,
}
const validCard = {
  creditCard: {
    holderName: "JOAO SILVA",
    number: "1234567890123456",
    expiryMonth: "12",
    expiryYear: "2027",
    ccv: "123",
  },
}

describe("POST /api/billing/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(session)
    mockSelect.mockResolvedValue([org])
    mockSet.mockReturnValue({ where: mockUpdate })
    mockUpdate.mockResolvedValue([])
    mockAsaas.customers.find.mockResolvedValue({ data: [] })
    mockAsaas.customers.create.mockResolvedValue({ id: "cus_new" })
    mockAsaas.subscriptions.create.mockResolvedValue({ id: "sub_new" })
  })

  it("retorna 401 sem sessão", async () => {
    mockAuth.mockResolvedValue(null)
    const { POST } = await import("./route")
    const res = await POST(makeRequest(validCard))
    expect(res.status).toBe(401)
  })

  it("retorna 401 sem organizationId", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } })
    const { POST } = await import("./route")
    const res = await POST(makeRequest(validCard))
    expect(res.status).toBe(401)
  })

  it("retorna 400 quando creditCard ausente", async () => {
    const { POST } = await import("./route")
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it("retorna 404 quando org não encontrada", async () => {
    mockSelect.mockResolvedValue([])
    const { POST } = await import("./route")
    const res = await POST(makeRequest(validCard))
    expect(res.status).toBe(404)
  })

  it("retorna 400 quando CNPJ ausente (perfil incompleto)", async () => {
    mockSelect.mockResolvedValue([{ ...org, cnpj: null }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest(validCard))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain("CNPJ")
  })

  it("retorna 400 quando endereço ausente (perfil incompleto)", async () => {
    mockSelect.mockResolvedValue([{ ...org, addressZipCode: null }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest(validCard))
    expect(res.status).toBe(400)
  })

  it("cria customer novo quando asaasCustomerId é null e nenhum customer existe", async () => {
    mockAsaas.customers.find.mockResolvedValue({ data: [] })
    const { POST } = await import("./route")
    await POST(makeRequest(validCard))
    expect(mockAsaas.customers.create).toHaveBeenCalledWith({
      name: "Acme",
      email: "owner@test.com",
      cpfCnpj: "12345678000195",
    })
  })

  it("reutiliza customer existente no Asaas quando encontrado por email", async () => {
    mockAsaas.customers.find.mockResolvedValue({ data: [{ id: "cus_existing" }] })
    const { POST } = await import("./route")
    await POST(makeRequest(validCard))
    expect(mockAsaas.customers.create).not.toHaveBeenCalled()
  })

  it("usa asaasCustomerId existente sem chamar Asaas", async () => {
    mockSelect.mockResolvedValue([{ ...org, asaasCustomerId: "cus_stored" }])
    const { POST } = await import("./route")
    await POST(makeRequest(validCard))
    expect(mockAsaas.customers.find).not.toHaveBeenCalled()
    expect(mockAsaas.customers.create).not.toHaveBeenCalled()
  })

  it("cria assinatura com valor 990 e billingType CREDIT_CARD", async () => {
    mockSelect.mockResolvedValue([{ ...org, asaasCustomerId: "cus_stored" }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest(validCard))
    expect(res.status).toBe(200)
    expect(mockAsaas.subscriptions.create).toHaveBeenCalledWith(
      expect.objectContaining({ value: 990, billingType: "CREDIT_CARD" })
    )
  })

  it("retorna ok:true e subscriptionId ao criar assinatura", async () => {
    mockSelect.mockResolvedValue([{ ...org, asaasCustomerId: "cus_stored" }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest(validCard))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.subscriptionId).toBe("sub_new")
  })

  it("salva subscriptionStatus active e asaasPlanId pro após assinatura", async () => {
    mockSelect.mockResolvedValue([{ ...org, asaasCustomerId: "cus_stored" }])
    const { POST } = await import("./route")
    await POST(makeRequest(validCard))
    const allSetCalls: unknown[] = mockSet.mock.calls.map((c: unknown[]) => c[0])
    expect(allSetCalls).toContainEqual(
      expect.objectContaining({ subscriptionStatus: "active", asaasPlanId: "pro", subscriptionEndsAt: null })
    )
  })

  it("usa dados cadastrais da org como holderInfo (cnpj, addressZipCode, addressNumber)", async () => {
    mockSelect.mockResolvedValue([{ ...org, asaasCustomerId: "cus_stored" }])
    const { POST } = await import("./route")
    await POST(makeRequest(validCard))
    expect(mockAsaas.subscriptions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        creditCardHolderInfo: expect.objectContaining({
          cpfCnpj: "12345678000195",
          postalCode: "01310100",
          addressNumber: "1000",
        }),
      })
    )
  })

  it("inclui phone da org quando disponível", async () => {
    mockSelect.mockResolvedValue([{ ...org, asaasCustomerId: "cus_stored", phone: "11999990000" }])
    const { POST } = await import("./route")
    await POST(makeRequest(validCard))
    expect(mockAsaas.subscriptions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        creditCardHolderInfo: expect.objectContaining({ phone: "11999990000" }),
      })
    )
  })

  it("lê remoteIp do último IP em x-forwarded-for", async () => {
    mockSelect.mockResolvedValue([{ ...org, asaasCustomerId: "cus_stored" }])
    const { POST } = await import("./route")
    await POST(makeRequest(validCard, { "x-forwarded-for": "spoofed-ip, 203.0.113.42" }))
    expect(mockAsaas.subscriptions.create).toHaveBeenCalledWith(
      expect.objectContaining({ remoteIp: "203.0.113.42" })
    )
  })

  it("usa x-real-ip quando x-forwarded-for ausente", async () => {
    mockSelect.mockResolvedValue([{ ...org, asaasCustomerId: "cus_stored" }])
    const { POST } = await import("./route")
    await POST(makeRequest(validCard, { "x-real-ip": "198.51.100.7" }))
    expect(mockAsaas.subscriptions.create).toHaveBeenCalledWith(
      expect.objectContaining({ remoteIp: "198.51.100.7" })
    )
  })
})
