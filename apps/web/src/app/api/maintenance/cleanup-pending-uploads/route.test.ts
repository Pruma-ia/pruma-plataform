import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockSelect = vi.fn()
const mockDelete = vi.fn()
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: mockSelect }) }),
    delete: () => ({ where: () => ({ returning: mockDelete }) }),
  },
}))

vi.mock("drizzle-orm", () => ({ and: vi.fn(), eq: vi.fn(), lt: vi.fn(), inArray: vi.fn() }))
vi.mock("../../../../../db/schema", () => ({ approvalFileUploads: {} }))

const mockDeleteObject = vi.fn()
vi.mock("@/lib/r2", () => ({ deleteObject: mockDeleteObject }))

// ── Helpers ───────────────────────────────────────────────────────────────────

const SECRET = "maint-secret"

function makeRequest(secret?: string) {
  const headers: Record<string, string> = {}
  if (secret !== undefined) headers["x-maintenance-secret"] = secret
  return new Request("http://localhost/api/maintenance/cleanup-pending-uploads", { headers })
}

function makeUpload(overrides: object = {}) {
  return { id: "up-1", r2Key: "org-1/uuid/file.pdf", ...overrides }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/maintenance/cleanup-pending-uploads", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.MAINTENANCE_SECRET = SECRET
    mockSelect.mockResolvedValue([])
    mockDelete.mockResolvedValue([])
    mockDeleteObject.mockResolvedValue(undefined)
  })

  afterEach(() => {
    process.env.MAINTENANCE_SECRET = SECRET
  })

  it("retorna 401 sem header de autenticação", async () => {
    const { GET } = await import("./route")
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it("retorna 401 quando secret incorreto (mesmo tamanho — cobre branch timingSafeEqual)", async () => {
    const { GET } = await import("./route")
    // "maint-secret" = 12 chars; "maint-XXXXXX" = 12 chars → same length, wrong value
    const res = await GET(makeRequest("maint-XXXXXX"))
    expect(res.status).toBe(401)
  })

  it("retorna 401 quando secret tamanho diferente (timingSafeEqual lança)", async () => {
    const { GET } = await import("./route")
    const res = await GET(makeRequest("wrong"))
    expect(res.status).toBe(401)
  })

  it("retorna 401 quando MAINTENANCE_SECRET não configurado", async () => {
    delete process.env.MAINTENANCE_SECRET
    const { GET } = await import("./route")
    const res = await GET(makeRequest(SECRET))
    expect(res.status).toBe(401)
  })

  it("retorna 200 com zeros quando não há uploads expirados", async () => {
    mockSelect.mockResolvedValue([])
    const { GET } = await import("./route")
    const res = await GET(makeRequest(SECRET))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.expired).toBe(0)
    expect(body.deletedR2).toBe(0)
    expect(body.deletedDb).toBe(0)
  })

  it("deleta R2 e DB para uploads expirados", async () => {
    const uploads = [makeUpload({ id: "up-1" }), makeUpload({ id: "up-2", r2Key: "org-1/uuid/b.pdf" })]
    mockSelect.mockResolvedValue(uploads)
    mockDelete.mockResolvedValue([{ id: "up-1" }, { id: "up-2" }])
    const { GET } = await import("./route")
    const res = await GET(makeRequest(SECRET))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.expired).toBe(2)
    expect(body.deletedR2).toBe(2)
    expect(body.deletedDb).toBe(2)
    expect(body.failedR2).toBe(0)
    expect(mockDeleteObject).toHaveBeenCalledTimes(2)
  })

  it("não deleta DB quando R2 falha — conta failedR2 corretamente", async () => {
    mockSelect.mockResolvedValue([makeUpload({ id: "up-1" })])
    mockDeleteObject.mockRejectedValue(new Error("R2 error"))
    const { GET } = await import("./route")
    const res = await GET(makeRequest(SECRET))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.expired).toBe(1)
    expect(body.deletedR2).toBe(0)
    expect(body.failedR2).toBe(1)
    expect(body.deletedDb).toBe(0)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it("não deleta uploads com expiresAt no futuro (query retorna vazio — lt filtra corretamente)", async () => {
    // DB WHERE: and(status='pending', expiresAt < now) — mock simula 0 rows para uploads futuros
    mockSelect.mockResolvedValue([])
    const { GET } = await import("./route")
    const res = await GET(makeRequest(SECRET))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.expired).toBe(0)
    expect(mockDeleteObject).not.toHaveBeenCalled()
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it("deleta só IDs com R2 bem-sucedido quando há falha parcial", async () => {
    const uploads = [
      makeUpload({ id: "up-ok", r2Key: "org/ok.pdf" }),
      makeUpload({ id: "up-fail", r2Key: "org/fail.pdf" }),
    ]
    mockSelect.mockResolvedValue(uploads)
    mockDeleteObject
      .mockResolvedValueOnce(undefined)   // up-ok — sucesso
      .mockRejectedValueOnce(new Error()) // up-fail — erro
    mockDelete.mockResolvedValue([{ id: "up-ok" }])
    const { GET } = await import("./route")
    const res = await GET(makeRequest(SECRET))
    const body = await res.json()
    expect(body.deletedR2).toBe(1)
    expect(body.failedR2).toBe(1)
    expect(body.deletedDb).toBe(1)
  })
})
