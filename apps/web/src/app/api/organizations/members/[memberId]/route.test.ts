import { describe, it, expect, vi, beforeEach } from "vitest"

const mockAuth = vi.fn()
vi.mock("@/lib/auth", () => ({ auth: mockAuth }))

const mockSelect = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: mockSelect }) }),
    update: () => ({ set: () => ({ where: mockUpdate }) }),
    delete: () => ({ where: mockDelete }),
  },
}))

vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn() }))
vi.mock("../../../../../../db/schema", () => ({ organizationMembers: {} }))

function makeRequest(method: string, body?: object) {
  return new Request("http://localhost/api/organizations/members/mem-1", {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
}

function makeParams(memberId = "mem-1") {
  return { params: Promise.resolve({ memberId }) }
}

const ownerSession = { user: { id: "u1", organizationId: "org-1", role: "owner" } }
const memberSession = { user: { id: "u2", organizationId: "org-1", role: "member" } }

describe("PATCH /api/organizations/members/[memberId]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(ownerSession)
    mockUpdate.mockResolvedValue([])
  })

  it("retorna 401 sem sessão", async () => {
    mockAuth.mockResolvedValue(null)
    const { PATCH } = await import("./route")
    const res = await PATCH(makeRequest("PATCH", { role: "admin" }), makeParams())
    expect(res.status).toBe(401)
  })

  it("retorna 403 quando role é member", async () => {
    mockAuth.mockResolvedValue(memberSession)
    const { PATCH } = await import("./route")
    const res = await PATCH(makeRequest("PATCH", { role: "admin" }), makeParams())
    expect(res.status).toBe(403)
  })

  it("lança ZodError para role inválido (rota usa parse sem try/catch)", async () => {
    const { PATCH } = await import("./route")
    await expect(
      PATCH(makeRequest("PATCH", { role: "superuser" }), makeParams())
    ).rejects.toThrow()
  })

  it("retorna 403 quando role é undefined (cobre branch ?? '')", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u3", organizationId: "org-1", role: undefined } })
    const { PATCH } = await import("./route")
    const res = await PATCH(makeRequest("PATCH", { role: "admin" }), makeParams())
    expect(res.status).toBe(403)
  })

  it("atualiza role e retorna 200", async () => {
    const { PATCH } = await import("./route")
    const res = await PATCH(makeRequest("PATCH", { role: "admin" }), makeParams())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(mockUpdate).toHaveBeenCalled()
  })
})

describe("DELETE /api/organizations/members/[memberId]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(ownerSession)
    mockSelect.mockResolvedValue([{ id: "mem-1", role: "member" }])
    mockDelete.mockResolvedValue([])
  })

  it("retorna 401 sem sessão", async () => {
    mockAuth.mockResolvedValue(null)
    const { DELETE } = await import("./route")
    const res = await DELETE(makeRequest("DELETE"), makeParams())
    expect(res.status).toBe(401)
  })

  it("retorna 403 quando role é member", async () => {
    mockAuth.mockResolvedValue(memberSession)
    const { DELETE } = await import("./route")
    const res = await DELETE(makeRequest("DELETE"), makeParams())
    expect(res.status).toBe(403)
  })

  it("retorna 403 ao tentar remover owner", async () => {
    mockSelect.mockResolvedValue([{ id: "mem-1", role: "owner" }])
    const { DELETE } = await import("./route")
    const res = await DELETE(makeRequest("DELETE"), makeParams())
    expect(res.status).toBe(403)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it("remove membro e retorna 200", async () => {
    const { DELETE } = await import("./route")
    const res = await DELETE(makeRequest("DELETE"), makeParams())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(mockDelete).toHaveBeenCalled()
  })

  it("retorna 200 mesmo quando membro não encontrado (idempotente)", async () => {
    mockSelect.mockResolvedValue([])
    const { DELETE } = await import("./route")
    const res = await DELETE(makeRequest("DELETE"), makeParams())
    expect(res.status).toBe(200)
  })

  it("retorna 403 quando role é undefined no DELETE (cobre branch ?? '')", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u3", organizationId: "org-1", role: undefined } })
    const { DELETE } = await import("./route")
    const res = await DELETE(makeRequest("DELETE"), makeParams())
    expect(res.status).toBe(403)
  })
})
