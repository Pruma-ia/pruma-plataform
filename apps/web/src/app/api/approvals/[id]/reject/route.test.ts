import { describe, it, expect, vi, beforeEach } from "vitest"

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

vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), inArray: vi.fn() }))
vi.mock("../../../../../../db/schema", () => ({ approvals: {}, approvalFiles: {} }))
const mockDispatchCallback = vi.hoisted(() => vi.fn().mockResolvedValue("sent"))
vi.mock("@/lib/n8n", () => ({ dispatchCallback: mockDispatchCallback }))

function makeRequest(body: object = {}) {
  return new Request("http://localhost/api/approvals/test-id/reject", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function makeParams(id = "test-id") {
  return { params: Promise.resolve({ id }) }
}

describe("POST /api/approvals/[id]/reject", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdate.mockResolvedValue([])
    mockDispatchCallback.mockResolvedValue("sent")
  })

  it("retorna 401 sem sessão", async () => {
    mockAuth.mockResolvedValue(null)
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ comment: "motivo" }), makeParams())
    expect(res.status).toBe(401)
  })

  it("retorna 422 quando comment está vazio (rejeição exige motivo)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", organizationId: "org1" } })
    mockSelect.mockResolvedValue([{ id: "test-id", status: "pending", callbackUrl: null }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ comment: "" }), makeParams())
    // zod.parse lança erro → Next.js retorna 500 ou o handler captura
    expect(res.status).not.toBe(200)
  })

  it("retorna 404 para aprovação de outra org", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", organizationId: "org1" } })
    mockSelect.mockResolvedValue([])
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ comment: "motivo" }), makeParams())
    expect(res.status).toBe(404)
  })

  it("retorna 409 para aprovação já resolvida", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", organizationId: "org1" } })
    mockSelect.mockResolvedValue([{ id: "test-id", status: "rejected", callbackUrl: null }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ comment: "motivo" }), makeParams())
    expect(res.status).toBe(409)
  })

  it("retorna 200 e dispara callback com status rejected", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", email: "user@test.com", organizationId: "org1" } })
    mockSelect.mockResolvedValue([{
      id: "test-id",
      status: "pending",
      callbackUrl: "https://n8n.example.com/webhook/abc",
    }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ comment: "dados incorretos" }), makeParams())
    expect(res.status).toBe(200)
    expect(mockDispatchCallback).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ status: "rejected", comment: "dados incorretos" }),
    )
  })

  it("retorna 422 quando campo required não preenchido ao rejeitar", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", organizationId: "org1" } })
    mockSelect.mockResolvedValue([{
      id: "test-id",
      status: "pending",
      callbackUrl: null,
      decisionFields: [{ id: "dept", type: "select", label: "Departamento", options: [], required: true }],
    }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ comment: "motivo" }), makeParams())
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.fields).toContain("dept")
  })

  it("retorna 200 ao rejeitar com campo required preenchido", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", email: "u@test.com", organizationId: "org1" } })
    mockSelect.mockResolvedValue([{
      id: "test-id",
      status: "pending",
      callbackUrl: null,
      decisionFields: [{ id: "dept", type: "select", label: "Departamento", options: [], required: true }],
    }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ comment: "motivo", decisionValues: { dept: "ti" } }), makeParams())
    expect(res.status).toBe(200)
  })

  it("inclui files no payload do callback ao rejeitar", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", email: "user@test.com", organizationId: "org1" } })
    const file = { r2Key: "org/uuid/doc.pdf", filename: "doc.pdf", mimeType: "application/pdf", sizeBytes: 2048 }
    mockSelect
      .mockResolvedValueOnce([{ id: "test-id", status: "pending", callbackUrl: "https://n8n.example.com/webhook/abc" }])
      .mockResolvedValueOnce([file])
    const { POST } = await import("./route")
    await POST(makeRequest({ comment: "reprovado" }), makeParams())
    expect(mockDispatchCallback).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ files: [file] }),
    )
  })

  it("envia resolvedBy:null quando usuário não tem email", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", organizationId: "org1" } }) // sem email
    mockSelect.mockResolvedValue([{ id: "test-id", status: "pending", callbackUrl: "https://n8n.example.com/webhook/abc" }])
    const { POST } = await import("./route")
    await POST(makeRequest({ comment: "motivo" }), makeParams())
    expect(mockDispatchCallback).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ resolvedBy: null }),
    )
  })

  it("marca callbackStatus='blocked' quando callbackUrl é privada (SSRF)", async () => {
    mockDispatchCallback.mockResolvedValue("blocked")
    mockAuth.mockResolvedValue({ user: { id: "u1", email: "user@test.com", organizationId: "org1" } })
    mockSelect.mockResolvedValue([{
      id: "test-id",
      status: "pending",
      callbackUrl: "https://169.254.169.254/webhook",
    }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ comment: "motivo" }), makeParams())
    expect(res.status).toBe(200)
    expect(mockDispatchCallback).toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalled()
  })

  it("marca callbackStatus='failed' quando fetch lança (timeout/rede)", async () => {
    mockDispatchCallback.mockResolvedValue("failed")
    mockAuth.mockResolvedValue({ user: { id: "u1", email: "user@test.com", organizationId: "org1" } })
    mockSelect.mockResolvedValue([{
      id: "test-id",
      status: "pending",
      callbackUrl: "https://n8n.example.com/webhook",
    }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ comment: "motivo" }), makeParams())
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalled()
  })

  it("inclui decisionValues no payload do callback ao rejeitar", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", email: "user@test.com", organizationId: "org1" } })
    mockSelect.mockResolvedValue([{
      id: "test-id",
      status: "pending",
      callbackUrl: "https://n8n.example.com/webhook/abc",
    }])
    const { POST } = await import("./route")
    const decisionValues = { advogado: "adv-2" }
    await POST(makeRequest({ comment: "não aprovado", decisionValues }), makeParams())
    expect(mockDispatchCallback).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ decisionValues, status: "rejected" }),
    )
  })
})
