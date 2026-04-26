import { describe, it, expect, vi, beforeEach } from "vitest"

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockAuth = vi.hoisted(() => vi.fn())
let selectCallCount = 0
let insertCallCount = 0

vi.mock("@/lib/auth", () => ({ auth: mockAuth }))

vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => {
          selectCallCount++
          return Promise.resolve(mockSelect())
        },
      }),
    }),
    insert: () => ({
      values: () => {
        insertCallCount++
        if (insertCallCount === 1) return { returning: () => Promise.resolve([{ id: "org-1", slug: "acme" }]) }
        return Promise.resolve([])
      },
    }),
  },
}))

vi.mock("drizzle-orm", () => ({ eq: vi.fn() }))
vi.mock("../../../../../db/schema", () => ({ organizations: {}, organizationMembers: {} }))

const sessionWithoutOrg = {
  user: { id: "user-1", organizationId: undefined },
}
const sessionWithOrg = {
  user: { id: "user-1", organizationId: "org-existing" },
}

function makeRequest(body: object) {
  return new Request("http://localhost/api/auth/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("POST /api/auth/onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallCount = 0
    insertCallCount = 0
    mockSelect.mockReturnValue([])
    mockAuth.mockResolvedValue(sessionWithoutOrg)
  })

  it("retorna 401 quando não autenticado", async () => {
    mockAuth.mockResolvedValue(null)
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ organizationName: "Acme" }))
    expect(res.status).toBe(401)
  })

  it("retorna 409 quando usuário já tem organização", async () => {
    mockAuth.mockResolvedValue(sessionWithOrg)
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ organizationName: "Acme" }))
    expect(res.status).toBe(409)
  })

  it("retorna 400 quando organizationName ausente", async () => {
    const { POST } = await import("./route")
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it("retorna 400 quando organizationName curto (< 2 chars)", async () => {
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ organizationName: "A" }))
    expect(res.status).toBe(400)
  })

  it("retorna 200 e cria org + membership", async () => {
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ organizationName: "Acme Corp" }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it("appends timestamp ao slug quando já existe conflito", async () => {
    mockSelect.mockReturnValueOnce([{ id: "slug-taken" }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ organizationName: "Acme Corp" }))
    expect(res.status).toBe(200)
  })
})
