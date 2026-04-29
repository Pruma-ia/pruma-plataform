import { describe, it, expect, vi, beforeEach } from "vitest"

const mockReturning = vi.fn()
const mockWhere = vi.fn()
const mockSet = vi.fn()

vi.mock("@/lib/db", () => ({
  db: {
    update: () => ({ set: mockSet }),
  },
}))

vi.mock("drizzle-orm", () => ({
  and: vi.fn(),
  eq: vi.fn(),
  lt: vi.fn(),
  isNotNull: vi.fn(),
}))

vi.mock("../../../../../db/schema", () => ({ organizations: {} }))

const SECRET = "test-secret"

function makeRequest(secret?: string) {
  const headers: Record<string, string> = {}
  if (secret !== undefined) headers["x-maintenance-secret"] = secret
  return new Request("http://localhost/api/maintenance/expire-trials", { headers })
}

describe("GET /api/maintenance/expire-trials", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.MAINTENANCE_SECRET = SECRET
    mockSet.mockReturnValue({ where: mockWhere })
    mockWhere.mockReturnValue({ returning: mockReturning })
    mockReturning.mockResolvedValue([])
  })

  it("retorna 401 sem header", async () => {
    const { GET } = await import("./route")
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it("retorna 401 com secret errado", async () => {
    const { GET } = await import("./route")
    const res = await GET(makeRequest("wrong-secret"))
    expect(res.status).toBe(401)
  })

  it("retorna 401 quando MAINTENANCE_SECRET não está definido", async () => {
    delete process.env.MAINTENANCE_SECRET
    const { GET } = await import("./route")
    const res = await GET(makeRequest(SECRET))
    expect(res.status).toBe(401)
  })

  it("retorna 200 com expired: 0 quando nenhum trial expirado", async () => {
    mockReturning.mockResolvedValue([])
    const { GET } = await import("./route")
    const res = await GET(makeRequest(SECRET))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.expired).toBe(0)
  })

  it("retorna 200 com count de orgs expiradas", async () => {
    mockReturning.mockResolvedValue([{ id: "org-1" }, { id: "org-2" }])
    const { GET } = await import("./route")
    const res = await GET(makeRequest(SECRET))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.expired).toBe(2)
  })

  it("chama update com status inactive", async () => {
    mockReturning.mockResolvedValue([{ id: "org-1" }])
    const { GET } = await import("./route")
    await GET(makeRequest(SECRET))
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionStatus: "inactive" }),
    )
  })
})
