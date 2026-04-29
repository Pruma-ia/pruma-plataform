import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const mockSet = vi.fn()
const mockUpdate = vi.fn()
vi.mock("@/lib/db", () => ({
  db: {
    update: () => ({ set: mockSet }),
  },
}))

vi.mock("drizzle-orm", () => ({ eq: vi.fn() }))
vi.mock("../../../../../db/schema", () => ({ organizations: {} }))

const TOKEN = "asaas-webhook-token"

function makeRequest(body: object, token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token !== undefined) headers["asaas-access-token"] = token
  return new Request("http://localhost/api/webhooks/asaas", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })
}

describe("POST /api/webhooks/asaas", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ASAAS_WEBHOOK_TOKEN = TOKEN
    mockSet.mockReturnValue({ where: mockUpdate })
    mockUpdate.mockResolvedValue([])
  })

  afterEach(() => {
    process.env.ASAAS_WEBHOOK_TOKEN = TOKEN
  })

  it("retorna 401 sem token", async () => {
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ event: "PAYMENT_CONFIRMED" }))
    expect(res.status).toBe(401)
  })

  it("retorna 401 com token errado", async () => {
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ event: "PAYMENT_CONFIRMED" }, "wrong-token"))
    expect(res.status).toBe(401)
  })

  it("retorna 200 sem update quando asaasSubscriptionId ausente no payload", async () => {
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ event: "PAYMENT_CONFIRMED", payment: {} }, TOKEN))
    expect(res.status).toBe(200)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it("retorna 200 sem update para evento desconhecido", async () => {
    const { POST } = await import("./route")
    const res = await POST(makeRequest({
      event: "SOME_UNKNOWN_EVENT",
      subscription: { id: "sub_1" },
    }, TOKEN))
    expect(res.status).toBe(200)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it.each([
    ["PAYMENT_CONFIRMED", "active"],
    ["PAYMENT_RECEIVED", "active"],
    ["PAYMENT_OVERDUE", "past_due"],
    ["SUBSCRIPTION_DELETED", "canceled"],
    ["PAYMENT_DELETED", "canceled"],
  ])("mapeia evento %s → status %s e atualiza org", async (event, expectedStatus) => {
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ event, subscription: { id: "sub_1" } }, TOKEN))
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalled()
  })

  it("resolve asaasSubscriptionId de payment.subscription quando subscription ausente", async () => {
    const { POST } = await import("./route")
    const res = await POST(makeRequest({
      event: "PAYMENT_CONFIRMED",
      payment: { subscription: "sub_from_payment" },
    }, TOKEN))
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalled()
  })

  it("PAYMENT_CONFIRMED limpa subscriptionEndsAt (null)", async () => {
    const { POST } = await import("./route")
    await POST(makeRequest({ event: "PAYMENT_CONFIRMED", subscription: { id: "sub_1" } }, TOKEN))
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionStatus: "active", subscriptionEndsAt: null }),
    )
  })

  it("PAYMENT_RECEIVED limpa subscriptionEndsAt (null)", async () => {
    const { POST } = await import("./route")
    await POST(makeRequest({ event: "PAYMENT_RECEIVED", subscription: { id: "sub_1" } }, TOKEN))
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionStatus: "active", subscriptionEndsAt: null }),
    )
  })

  it("SUBSCRIPTION_DELETED define subscriptionEndsAt como data atual", async () => {
    const before = Date.now()
    const { POST } = await import("./route")
    await POST(makeRequest({ event: "SUBSCRIPTION_DELETED", subscription: { id: "sub_1" } }, TOKEN))
    const after = Date.now()
    const setArg = mockSet.mock.calls[0][0]
    expect(setArg.subscriptionStatus).toBe("canceled")
    expect(setArg.subscriptionEndsAt).toBeInstanceOf(Date)
    expect(setArg.subscriptionEndsAt.getTime()).toBeGreaterThanOrEqual(before)
    expect(setArg.subscriptionEndsAt.getTime()).toBeLessThanOrEqual(after)
  })

  it("PAYMENT_OVERDUE não altera subscriptionEndsAt", async () => {
    const { POST } = await import("./route")
    await POST(makeRequest({ event: "PAYMENT_OVERDUE", subscription: { id: "sub_1" } }, TOKEN))
    const setArg = mockSet.mock.calls[0][0]
    expect(setArg.subscriptionStatus).toBe("past_due")
    expect(setArg).not.toHaveProperty("subscriptionEndsAt")
  })
})
