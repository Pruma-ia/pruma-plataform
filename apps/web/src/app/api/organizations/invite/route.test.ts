import { describe, it, expect, vi, beforeEach } from "vitest"

const mockAuth = vi.fn()
vi.mock("@/lib/auth", () => ({ auth: mockAuth }))

const mockInsert = vi.fn()
const mockSelect = vi.fn()
vi.mock("@/lib/db", () => ({
  db: {
    insert: () => ({ values: mockInsert }),
    select: () => ({ from: () => ({ where: mockSelect }) }),
  },
}))

vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn() }))
vi.mock("../../../../../db/schema", () => ({ organizationInvites: {}, users: {} }))

function makePostRequest(body: object) {
  return new Request("http://localhost/api/organizations/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function makeGetRequest() {
  return new Request("http://localhost/api/organizations/invite")
}

const ownerSession = { user: { id: "u1", organizationId: "org-1", role: "owner" } }
const memberSession = { user: { id: "u2", organizationId: "org-1", role: "member" } }

describe("POST /api/organizations/invite", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = "https://app.test.pruma.ia"
    mockAuth.mockResolvedValue(ownerSession)
    mockInsert.mockResolvedValue([])
  })

  it("retorna 401 sem sessão", async () => {
    mockAuth.mockResolvedValue(null)
    const { POST } = await import("./route")
    const res = await POST(makePostRequest({ email: "guest@test.com" }))
    expect(res.status).toBe(401)
  })

  it("retorna 403 quando role é member (sem permissão)", async () => {
    mockAuth.mockResolvedValue(memberSession)
    const { POST } = await import("./route")
    const res = await POST(makePostRequest({ email: "guest@test.com" }))
    expect(res.status).toBe(403)
  })

  it("retorna 400 para email inválido", async () => {
    const { POST } = await import("./route")
    const res = await POST(makePostRequest({ email: "not-an-email" }))
    expect(res.status).toBe(400)
  })

  it("retorna 200 com inviteUrl para owner", async () => {
    const { POST } = await import("./route")
    const res = await POST(makePostRequest({ email: "guest@test.com", role: "member" }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.inviteUrl).toContain("/invite/")
    expect(mockInsert).toHaveBeenCalled()
  })

  it("retorna 200 com role padrão 'member' quando role não fornecido", async () => {
    const { POST } = await import("./route")
    const res = await POST(makePostRequest({ email: "guest@test.com" }))
    expect(res.status).toBe(200)
  })

  it("retorna 200 para admin (também tem permissão de convidar)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u3", organizationId: "org-1", role: "admin" } })
    const { POST } = await import("./route")
    const res = await POST(makePostRequest({ email: "guest@test.com" }))
    expect(res.status).toBe(200)
  })
})

describe("GET /api/organizations/invite", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(ownerSession)
    mockSelect.mockResolvedValue([])
  })

  it("retorna 401 sem sessão", async () => {
    mockAuth.mockResolvedValue(null)
    const { GET } = await import("./route")
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it("retorna lista de convites pendentes", async () => {
    const invite = { id: "inv-1", email: "guest@test.com", role: "member", token: "tok", expiresAt: new Date().toISOString() }
    mockSelect.mockResolvedValue([invite])
    const { GET } = await import("./route")
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.invites).toHaveLength(1)
    expect(body.invites[0].email).toBe("guest@test.com")
  })

  it("retorna lista vazia quando não há convites", async () => {
    const { GET } = await import("./route")
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.invites).toEqual([])
  })

  it("retorna 403 em POST quando role é undefined (cobre branch ?? '' no POST)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u4", organizationId: "org-1", role: undefined } })
    const { POST } = await import("./route")
    const res = await POST(makePostRequest({ email: "guest@test.com" }))
    expect(res.status).toBe(403)
  })

  it("retorna 403 quando role não tem permissão (member/viewer)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u2", organizationId: "org-1", role: "viewer" } })
    const { GET } = await import("./route")
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it("retorna 403 quando role é undefined (cobre branch ?? '')", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u3", organizationId: "org-1", role: undefined } })
    const { GET } = await import("./route")
    const res = await GET()
    expect(res.status).toBe(403)
  })
})
