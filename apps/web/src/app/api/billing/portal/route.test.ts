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
  subscriptions: {
    cancel: vi.fn(),
    get: vi.fn(),
  },
}
vi.mock("@/lib/asaas", () => ({ asaas: mockAsaas }))

const session = { user: { id: "u1", organizationId: "org-1" } }
const org = { id: "org-1", asaasSubscriptionId: "sub_1" }

describe("billing/portal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(session)
    mockSelect.mockResolvedValue([org])
    mockUpdate.mockResolvedValue([])
    mockAsaas.subscriptions.cancel.mockResolvedValue({})
    mockAsaas.subscriptions.get.mockResolvedValue({ id: "sub_1", status: "ACTIVE" })
  })

  describe("DELETE (cancelar assinatura)", () => {
    it("retorna 401 sem sessão", async () => {
      mockAuth.mockResolvedValue(null)
      const { DELETE } = await import("./route")
      const res = await DELETE()
      expect(res.status).toBe(401)
    })

    it("retorna 401 sem organizationId", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } })
      const { DELETE } = await import("./route")
      const res = await DELETE()
      expect(res.status).toBe(401)
    })

    it("retorna 404 quando org não tem assinatura ativa", async () => {
      mockSelect.mockResolvedValue([{ id: "org-1", asaasSubscriptionId: null }])
      const { DELETE } = await import("./route")
      const res = await DELETE()
      expect(res.status).toBe(404)
    })

    it("retorna 404 quando org não encontrada", async () => {
      mockSelect.mockResolvedValue([])
      const { DELETE } = await import("./route")
      const res = await DELETE()
      expect(res.status).toBe(404)
    })

    it("cancela assinatura e retorna 200", async () => {
      const { DELETE } = await import("./route")
      const res = await DELETE()
      expect(res.status).toBe(200)
      expect(mockAsaas.subscriptions.cancel).toHaveBeenCalledWith("sub_1")
      expect(mockUpdate).toHaveBeenCalled()
      const body = await res.json()
      expect(body.ok).toBe(true)
    })
  })

  describe("GET (detalhes da assinatura)", () => {
    it("retorna 401 sem sessão", async () => {
      mockAuth.mockResolvedValue(null)
      const { GET } = await import("./route")
      const res = await GET()
      expect(res.status).toBe(401)
    })

    it("retorna 401 sem organizationId", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } })
      const { GET } = await import("./route")
      const res = await GET()
      expect(res.status).toBe(401)
    })

    it("retorna subscription null quando org não tem assinatura", async () => {
      mockSelect.mockResolvedValue([{ id: "org-1", asaasSubscriptionId: null }])
      const { GET } = await import("./route")
      const res = await GET()
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.subscription).toBeNull()
    })

    it("retorna detalhes da assinatura do Asaas", async () => {
      const { GET } = await import("./route")
      const res = await GET()
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.subscription.id).toBe("sub_1")
      expect(mockAsaas.subscriptions.get).toHaveBeenCalledWith("sub_1")
    })
  })
})
