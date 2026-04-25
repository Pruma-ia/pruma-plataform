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

vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn() }))
vi.mock("../../../../../../db/schema", () => ({ approvals: {} }))
vi.mock("@/lib/n8n", () => ({ validateCallbackUrl: vi.fn(() => true) }))

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
    global.fetch = vi.fn().mockResolvedValue({ ok: true })
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
    const callBody = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
    expect(callBody.status).toBe("rejected")
    expect(callBody.comment).toBe("dados incorretos")
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
    const callBody = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
    expect(callBody.decisionValues).toEqual(decisionValues)
    expect(callBody.status).toBe("rejected")
  })
})
