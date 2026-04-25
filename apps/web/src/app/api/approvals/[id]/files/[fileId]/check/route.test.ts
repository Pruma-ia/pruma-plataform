import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockAuth = vi.fn()
vi.mock("@/lib/auth", () => ({ auth: mockAuth }))

const mockSelect = vi.fn()
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: mockSelect }) }),
  },
}))

vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn() }))
vi.mock("../../../../../../../../db/schema", () => ({ approvals: {}, approvalFiles: {} }))

const mockObjectExists = vi.fn()
vi.mock("@/lib/r2", () => ({ objectExists: mockObjectExists }))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeParams(id = "appr-1", fileId = "file-1") {
  return { params: Promise.resolve({ id, fileId }) }
}

const req = new Request("http://localhost/api/approvals/appr-1/files/file-1/check")

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/approvals/[id]/files/[fileId]/check", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockObjectExists.mockResolvedValue(true)
  })

  it("retorna 401 sem sessão", async () => {
    mockAuth.mockResolvedValue(null)
    const { GET } = await import("./route")
    const res = await GET(req, makeParams())
    expect(res.status).toBe(401)
  })

  it("retorna 401 quando user não tem organizationId", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", isSuperAdmin: true } })
    const { GET } = await import("./route")
    const res = await GET(req, makeParams())
    expect(res.status).toBe(401)
  })

  it("retorna 404 quando aprovação não pertence à org", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", organizationId: "org1" } })
    mockSelect
      .mockResolvedValueOnce([]) // approval não encontrada
    const { GET } = await import("./route")
    const res = await GET(req, makeParams())
    expect(res.status).toBe(404)
  })

  it("retorna 404 quando arquivo não encontrado na aprovação", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", organizationId: "org1" } })
    mockSelect
      .mockResolvedValueOnce([{ id: "appr-1" }])       // approval ok
      .mockResolvedValueOnce([])                        // file não encontrado
    const { GET } = await import("./route")
    const res = await GET(req, makeParams())
    expect(res.status).toBe(404)
  })

  it("retorna 200 com exists:true quando objeto existe no R2", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", organizationId: "org1" } })
    mockSelect
      .mockResolvedValueOnce([{ id: "appr-1" }])
      .mockResolvedValueOnce([{ r2Key: "org1/uuid/doc.pdf" }])
    mockObjectExists.mockResolvedValue(true)
    const { GET } = await import("./route")
    const res = await GET(req, makeParams())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.exists).toBe(true)
  })

  it("retorna 404 com exists:false quando objeto ausente no R2", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", organizationId: "org1" } })
    mockSelect
      .mockResolvedValueOnce([{ id: "appr-1" }])
      .mockResolvedValueOnce([{ r2Key: "org1/uuid/doc.pdf" }])
    mockObjectExists.mockResolvedValue(false)
    const { GET } = await import("./route")
    const res = await GET(req, makeParams())
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.exists).toBe(false)
  })

  it("passa o r2Key correto para objectExists", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", organizationId: "org1" } })
    const r2Key = "org1/some-uuid/contrato.pdf"
    mockSelect
      .mockResolvedValueOnce([{ id: "appr-1" }])
      .mockResolvedValueOnce([{ r2Key }])
    const { GET } = await import("./route")
    await GET(req, makeParams())
    expect(mockObjectExists).toHaveBeenCalledWith(r2Key)
  })
})
