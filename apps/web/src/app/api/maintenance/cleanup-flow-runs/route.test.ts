import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const mockDelete = vi.fn()
vi.mock("@/lib/db", () => ({
  db: {
    delete: () => ({ where: () => ({ returning: mockDelete }) }),
  },
}))

vi.mock("drizzle-orm", () => ({ lt: vi.fn() }))
vi.mock("../../../../../db/schema", () => ({ flowRuns: {} }))

const SECRET = "maint-secret"

function makeRequest(secret?: string) {
  const headers: Record<string, string> = {}
  if (secret !== undefined) headers["x-maintenance-secret"] = secret
  return new Request("http://localhost/api/maintenance/cleanup-flow-runs", { headers })
}

describe("GET /api/maintenance/cleanup-flow-runs", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.MAINTENANCE_SECRET = SECRET
    mockDelete.mockResolvedValue([])
  })

  afterEach(() => {
    process.env.MAINTENANCE_SECRET = SECRET
  })

  it("retorna 401 sem header", async () => {
    const { GET } = await import("./route")
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it("retorna 401 quando MAINTENANCE_SECRET não configurado", async () => {
    delete process.env.MAINTENANCE_SECRET
    const { GET } = await import("./route")
    const res = await GET(makeRequest(SECRET))
    expect(res.status).toBe(401)
  })

  it("retorna 401 quando secret errado (mesmo tamanho)", async () => {
    const { GET } = await import("./route")
    const res = await GET(makeRequest("maint-XXXXXX"))
    expect(res.status).toBe(401)
  })

  it("retorna 401 quando secret tamanho diferente (timingSafeEqual lança)", async () => {
    const { GET } = await import("./route")
    const res = await GET(makeRequest("wrong"))
    expect(res.status).toBe(401)
  })

  it("retorna 200 com deleted=0 quando não há flowRuns antigos", async () => {
    mockDelete.mockResolvedValue([])
    const { GET } = await import("./route")
    const res = await GET(makeRequest(SECRET))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.deleted).toBe(0)
    expect(body.retentionDays).toBe(90)
  })

  it("retorna deleted=N com count correto", async () => {
    mockDelete.mockResolvedValue([{ id: "r1" }, { id: "r2" }, { id: "r3" }])
    const { GET } = await import("./route")
    const res = await GET(makeRequest(SECRET))
    const body = await res.json()
    expect(body.deleted).toBe(3)
  })

  it("respeita FLOW_RUN_RETENTION_DAYS customizado", async () => {
    process.env.FLOW_RUN_RETENTION_DAYS = "30"
    const { GET } = await import("./route")
    const res = await GET(makeRequest(SECRET))
    const body = await res.json()
    expect(body.retentionDays).toBe(30)
    delete process.env.FLOW_RUN_RETENTION_DAYS
  })
})
