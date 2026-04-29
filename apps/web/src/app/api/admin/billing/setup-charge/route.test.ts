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
vi.mock("../../../../../../db/schema", () => ({ organizations: {} }))

const superAdminSession = { user: { isSuperAdmin: true } }
const regularSession = { user: { isSuperAdmin: false, organizationId: "org-1" } }

const org = { id: "org-1", name: "Acme", setupChargeStatus: null }

function makePost(body: object) {
  return new Request("http://localhost/api/admin/billing/setup-charge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function makeDelete(orgId?: string) {
  const url = orgId
    ? `http://localhost/api/admin/billing/setup-charge?orgId=${orgId}`
    : "http://localhost/api/admin/billing/setup-charge"
  return new Request(url, { method: "DELETE" })
}

describe("POST /api/admin/billing/setup-charge", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(superAdminSession)
    mockSelect.mockResolvedValue([org])
    mockSet.mockReturnValue({ where: mockUpdate })
    mockUpdate.mockResolvedValue([])
  })

  it("retorna 403 sem sessão", async () => {
    mockAuth.mockResolvedValue(null)
    const { POST } = await import("./route")
    const res = await POST(makePost({ orgId: "org-1", amount: 5000, installments: 3 }))
    expect(res.status).toBe(403)
  })

  it("retorna 403 para usuário não-superadmin", async () => {
    mockAuth.mockResolvedValue(regularSession)
    const { POST } = await import("./route")
    const res = await POST(makePost({ orgId: "org-1", amount: 5000, installments: 3 }))
    expect(res.status).toBe(403)
  })

  it("retorna 400 quando orgId ausente", async () => {
    const { POST } = await import("./route")
    const res = await POST(makePost({ amount: 5000, installments: 3 }))
    expect(res.status).toBe(400)
  })

  it("retorna 400 quando amount inválido (zero)", async () => {
    const { POST } = await import("./route")
    const res = await POST(makePost({ orgId: "org-1", amount: 0, installments: 3 }))
    expect(res.status).toBe(400)
  })

  it("retorna 400 quando installments > 12", async () => {
    const { POST } = await import("./route")
    const res = await POST(makePost({ orgId: "org-1", amount: 5000, installments: 13 }))
    expect(res.status).toBe(400)
  })

  it("retorna 400 quando amount é float (não inteiro)", async () => {
    const { POST } = await import("./route")
    const res = await POST(makePost({ orgId: "org-1", amount: 1234.56, installments: 3 }))
    expect(res.status).toBe(400)
  })

  it("retorna 404 quando org não encontrada", async () => {
    mockSelect.mockResolvedValue([])
    const { POST } = await import("./route")
    const res = await POST(makePost({ orgId: "org-99", amount: 5000, installments: 3 }))
    expect(res.status).toBe(404)
  })

  it("salva amount, installments e status pending na org", async () => {
    const { POST } = await import("./route")
    const res = await POST(makePost({ orgId: "org-1", amount: 5000, installments: 3 }))
    expect(res.status).toBe(200)
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        setupChargeAmount: 5000,
        setupChargeInstallments: 3,
        setupChargeStatus: "pending",
        setupChargeAsaasId: null,
      })
    )
  })

  it("retorna ok:true ao configurar setup charge", async () => {
    const { POST } = await import("./route")
    const res = await POST(makePost({ orgId: "org-1", amount: 5000, installments: 1 }))
    const body = await res.json()
    expect(body.ok).toBe(true)
  })
})

describe("DELETE /api/admin/billing/setup-charge", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(superAdminSession)
    mockSelect.mockResolvedValue([org])
    mockSet.mockReturnValue({ where: mockUpdate })
    mockUpdate.mockResolvedValue([])
  })

  it("retorna 403 sem sessão", async () => {
    mockAuth.mockResolvedValue(null)
    const { DELETE } = await import("./route")
    const res = await DELETE(makeDelete("org-1"))
    expect(res.status).toBe(403)
  })

  it("retorna 403 para usuário não-superadmin", async () => {
    mockAuth.mockResolvedValue(regularSession)
    const { DELETE } = await import("./route")
    const res = await DELETE(makeDelete("org-1"))
    expect(res.status).toBe(403)
  })

  it("retorna 400 quando orgId não fornecido", async () => {
    const { DELETE } = await import("./route")
    const res = await DELETE(makeDelete())
    expect(res.status).toBe(400)
  })

  it("retorna 404 quando org não encontrada", async () => {
    mockSelect.mockResolvedValue([])
    const { DELETE } = await import("./route")
    const res = await DELETE(makeDelete("org-99"))
    expect(res.status).toBe(404)
  })

  it("retorna 409 quando setup charge já foi pago", async () => {
    mockSelect.mockResolvedValue([{ ...org, setupChargeStatus: "paid" }])
    const { DELETE } = await import("./route")
    const res = await DELETE(makeDelete("org-1"))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toContain("already paid")
  })

  it("limpa todos os campos de setup charge ao remover", async () => {
    mockSelect.mockResolvedValue([{ ...org, setupChargeStatus: "pending", setupChargeAmount: 5000 }])
    const { DELETE } = await import("./route")
    const res = await DELETE(makeDelete("org-1"))
    expect(res.status).toBe(200)
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        setupChargeAmount: null,
        setupChargeInstallments: null,
        setupChargeStatus: null,
        setupChargeAsaasId: null,
      })
    )
  })

  it("retorna ok:true ao remover setup charge pendente", async () => {
    mockSelect.mockResolvedValue([{ ...org, setupChargeStatus: "pending" }])
    const { DELETE } = await import("./route")
    const res = await DELETE(makeDelete("org-1"))
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it("permite remover setup charge quando status é null", async () => {
    mockSelect.mockResolvedValue([{ ...org, setupChargeStatus: null }])
    const { DELETE } = await import("./route")
    const res = await DELETE(makeDelete("org-1"))
    expect(res.status).toBe(200)
  })
})
