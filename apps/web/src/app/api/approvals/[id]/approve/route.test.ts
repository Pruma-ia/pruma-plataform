import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockAuth = vi.fn()
vi.mock("@/lib/auth", () => ({ auth: mockAuth }))

const mockUpdate = vi.fn()
const mockSelect = vi.fn()
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: mockSelect }) }),
    update: () => ({ set: () => ({ where: mockUpdate }) }),
  },
}))

vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn() }))
vi.mock("../../../../../../db/schema", () => ({ approvals: {} }))

vi.mock("@/lib/n8n", () => ({
  validateCallbackUrl: vi.fn(() => true),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(body: object = {}) {
  return new Request("http://localhost/api/approvals/test-id/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function makeParams(id = "test-id") {
  return { params: Promise.resolve({ id }) }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/approvals/[id]/approve", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdate.mockResolvedValue([])
    global.fetch = vi.fn().mockResolvedValue({ ok: true })
  })

  it("retorna 401 quando não há sessão", async () => {
    mockAuth.mockResolvedValue(null)
    const { POST } = await import("./route")
    const res = await POST(makeRequest(), makeParams())
    expect(res.status).toBe(401)
  })

  it("retorna 401 quando user não tem organizationId (superadmin sem org)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", isSuperAdmin: true } })
    const { POST } = await import("./route")
    const res = await POST(makeRequest(), makeParams())
    expect(res.status).toBe(401)
  })

  it("retorna 404 quando aprovação não pertence à org", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", organizationId: "org1" } })
    mockSelect.mockResolvedValue([]) // nenhum resultado — aprovação não encontrada ou de outra org
    const { POST } = await import("./route")
    const res = await POST(makeRequest(), makeParams())
    expect(res.status).toBe(404)
  })

  it("retorna 409 quando aprovação já foi resolvida", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", organizationId: "org1" } })
    mockSelect.mockResolvedValue([{ id: "test-id", status: "approved", callbackUrl: null }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest(), makeParams())
    expect(res.status).toBe(409)
  })

  it("retorna 200 e dispara callback quando aprovação é válida", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", email: "user@test.com", organizationId: "org1" } })
    mockSelect.mockResolvedValue([{
      id: "test-id",
      status: "pending",
      callbackUrl: "https://n8n.example.com/webhook/abc",
    }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ comment: "ok" }), makeParams())
    expect(res.status).toBe(200)
    expect(global.fetch).toHaveBeenCalledWith(
      "https://n8n.example.com/webhook/abc",
      expect.objectContaining({ method: "POST" }),
    )
  })

  it("não dispara callback quando callbackUrl está ausente", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", email: "user@test.com", organizationId: "org1" } })
    mockSelect.mockResolvedValue([{ id: "test-id", status: "pending", callbackUrl: null }])
    const { POST } = await import("./route")
    await POST(makeRequest(), makeParams())
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
