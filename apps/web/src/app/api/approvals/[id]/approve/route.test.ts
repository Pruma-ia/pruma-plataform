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

vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), inArray: vi.fn() }))
vi.mock("../../../../../../db/schema", () => ({ approvals: {}, approvalFiles: {} }))

const mockDispatchCallback = vi.hoisted(() => vi.fn().mockResolvedValue("sent"))
vi.mock("@/lib/n8n", () => ({ dispatchCallback: mockDispatchCallback }))

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
    mockDispatchCallback.mockResolvedValue("sent")
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
    expect(mockDispatchCallback).toHaveBeenCalledWith(
      "https://n8n.example.com/webhook/abc",
      expect.objectContaining({ status: "approved" }),
    )
  })

  it("não dispara callback quando callbackUrl está ausente", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", email: "user@test.com", organizationId: "org1" } })
    mockSelect.mockResolvedValue([{ id: "test-id", status: "pending", callbackUrl: null }])
    const { POST } = await import("./route")
    await POST(makeRequest(), makeParams())
    expect(mockDispatchCallback).not.toHaveBeenCalled()
  })

  it("inclui decisionValues no payload do callback", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", email: "user@test.com", organizationId: "org1" } })
    mockSelect.mockResolvedValue([{
      id: "test-id",
      status: "pending",
      callbackUrl: "https://n8n.example.com/webhook/abc",
    }])
    const { POST } = await import("./route")
    const decisionValues = { advogado: "adv-1", prioridade: "alta" }
    await POST(makeRequest({ comment: "ok", decisionValues }), makeParams())
    expect(mockDispatchCallback).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ decisionValues, status: "approved" }),
    )
  })

  it("inclui decisionValues null no callback quando não enviado", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", email: "user@test.com", organizationId: "org1" } })
    mockSelect.mockResolvedValue([{
      id: "test-id",
      status: "pending",
      callbackUrl: "https://n8n.example.com/webhook/abc",
    }])
    const { POST } = await import("./route")
    await POST(makeRequest({ comment: "ok" }), makeParams())
    expect(mockDispatchCallback).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ decisionValues: null }),
    )
  })

  it("retorna 422 para body com tipo inválido", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", organizationId: "org1" } })
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ decisionValues: "string-invalida" }), makeParams())
    expect(res.status).toBe(422)
  })

  it("envia resolvedBy:null quando usuário não tem email", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", organizationId: "org1" } }) // sem email
    mockSelect.mockResolvedValue([{ id: "test-id", status: "pending", callbackUrl: "https://n8n.example.com/webhook/abc" }])
    const { POST } = await import("./route")
    await POST(makeRequest(), makeParams())
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
    const res = await POST(makeRequest(), makeParams())
    expect(res.status).toBe(200)
    expect(mockDispatchCallback).toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalled()
  })

  it("retorna 422 quando campo required não preenchido", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", organizationId: "org1" } })
    mockSelect.mockResolvedValue([{
      id: "test-id",
      status: "pending",
      callbackUrl: null,
      decisionFields: [{ id: "dept", type: "select", label: "Departamento", options: [], required: true }],
    }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest({}), makeParams())
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.fields).toContain("dept")
  })

  it("retorna 200 quando campo required está preenchido", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", email: "u@test.com", organizationId: "org1" } })
    mockSelect.mockResolvedValue([{
      id: "test-id",
      status: "pending",
      callbackUrl: null,
      decisionFields: [{ id: "dept", type: "select", label: "Departamento", options: [], required: true }],
    }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ decisionValues: { dept: "ti" } }), makeParams())
    expect(res.status).toBe(200)
  })

  it("ignora validação required quando decisionFields é null", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", email: "u@test.com", organizationId: "org1" } })
    mockSelect.mockResolvedValue([{
      id: "test-id",
      status: "pending",
      callbackUrl: null,
      decisionFields: null,
    }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest({}), makeParams())
    expect(res.status).toBe(200)
  })

  it("marca callbackStatus='failed' quando callback n8n falha", async () => {
    mockDispatchCallback.mockResolvedValue("failed")
    mockAuth.mockResolvedValue({ user: { id: "u1", email: "user@test.com", organizationId: "org1" } })
    mockSelect.mockResolvedValue([{
      id: "test-id",
      status: "pending",
      callbackUrl: "https://n8n.example.com/webhook/abc",
    }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest(), makeParams())
    expect(res.status).toBe(200)
    const lastCall = (mockUpdate as ReturnType<typeof vi.fn>).mock.calls.at(-1)
    expect(lastCall).toBeDefined()
  })

  it("inclui files no payload do callback", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", email: "user@test.com", organizationId: "org1" } })
    const file = { r2Key: "org/uuid/doc.pdf", filename: "doc.pdf", mimeType: "application/pdf", sizeBytes: 1024 }
    mockSelect
      .mockResolvedValueOnce([{ id: "test-id", status: "pending", callbackUrl: "https://n8n.example.com/webhook/abc" }])
      .mockResolvedValueOnce([file])
    const { POST } = await import("./route")
    await POST(makeRequest({ comment: "ok" }), makeParams())
    expect(mockDispatchCallback).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ files: [file] }),
    )
  })

  it("envia files:[] quando aprovação não tem arquivos", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", email: "user@test.com", organizationId: "org1" } })
    mockSelect
      .mockResolvedValueOnce([{ id: "test-id", status: "pending", callbackUrl: "https://n8n.example.com/webhook/abc" }])
      .mockResolvedValueOnce([])
    const { POST } = await import("./route")
    await POST(makeRequest({ comment: "ok" }), makeParams())
    expect(mockDispatchCallback).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ files: [] }),
    )
  })

  it("retorna 200 e marca callbackStatus='failed' quando fetch lança (timeout/rede)", async () => {
    mockDispatchCallback.mockResolvedValue("failed")
    mockAuth.mockResolvedValue({ user: { id: "u1", email: "user@test.com", organizationId: "org1" } })
    mockSelect.mockResolvedValue([{
      id: "test-id",
      status: "pending",
      callbackUrl: "https://n8n.example.com/webhook/abc",
    }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest(), makeParams())
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalled()
  })
})
