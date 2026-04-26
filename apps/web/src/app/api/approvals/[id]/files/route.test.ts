import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockAuth = vi.fn()
vi.mock("@/lib/auth", () => ({ auth: mockAuth }))

const mockSelectApproval = vi.fn()
const mockSelectFiles = vi.fn()

let selectCallCount = 0
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => {
          selectCallCount++
          return selectCallCount === 1
            ? Promise.resolve(mockSelectApproval())
            : Promise.resolve(mockSelectFiles())
        },
      }),
    }),
  },
}))

vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn() }))
vi.mock("../../../../../../db/schema", () => ({
  approvals: {},
  approvalFiles: {},
}))

const mockPresignReadUrl = vi.fn()
vi.mock("@/lib/r2", () => ({ presignReadUrl: mockPresignReadUrl }))

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest() {
  return new Request("http://localhost/api/approvals/test-id/files")
}

function makeParams(id = "test-id") {
  return { params: Promise.resolve({ id }) }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/approvals/[id]/files", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallCount = 0
    mockPresignReadUrl.mockResolvedValue("https://r2.example.com/signed-read-url")
  })

  it("retorna 401 sem sessão", async () => {
    mockAuth.mockResolvedValue(null)
    const { GET } = await import("./route")
    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(401)
  })

  it("retorna 401 para superadmin sem organizationId", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", isSuperAdmin: true } })
    const { GET } = await import("./route")
    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(401)
  })

  it("retorna 404 quando aprovação não pertence à org", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", organizationId: "org1" } })
    mockSelectApproval.mockReturnValue([])
    const { GET } = await import("./route")
    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(404)
  })

  it("retorna 200 com files=[] quando aprovação não tem arquivos", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", organizationId: "org1" } })
    mockSelectApproval.mockReturnValue([{ id: "test-id" }])
    mockSelectFiles.mockReturnValue([])
    const { GET } = await import("./route")
    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.files).toEqual([])
  })

  it("retorna 200 com signed URLs para cada arquivo", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", organizationId: "org1" } })
    mockSelectApproval.mockReturnValue([{ id: "test-id" }])
    mockSelectFiles.mockReturnValue([
      { id: "f1", filename: "contrato.pdf", mimeType: "application/pdf", sizeBytes: 50000, r2Key: "org-1/uuid/contrato.pdf" },
      { id: "f2", filename: "foto.jpg", mimeType: "image/jpeg", sizeBytes: 12000, r2Key: "org-1/uuid/foto.jpg" },
    ])
    const { GET } = await import("./route")
    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.files).toHaveLength(2)
    expect(body.files[0].url).toBe("https://r2.example.com/signed-read-url")
    expect(body.files[0].id).toBe("f1")
    expect(body.files[1].filename).toBe("foto.jpg")
    // r2Key não deve vazar na resposta
    expect(body.files[0].r2Key).toBeUndefined()
  })

  it("chama presignReadUrl uma vez por arquivo", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", organizationId: "org1" } })
    mockSelectApproval.mockReturnValue([{ id: "test-id" }])
    mockSelectFiles.mockReturnValue([
      { id: "f1", filename: "a.pdf", mimeType: "application/pdf", sizeBytes: 1000, r2Key: "org/1/a.pdf" },
      { id: "f2", filename: "b.pdf", mimeType: "application/pdf", sizeBytes: 2000, r2Key: "org/2/b.pdf" },
    ])
    const { GET } = await import("./route")
    await GET(makeRequest(), makeParams())
    expect(mockPresignReadUrl).toHaveBeenCalledTimes(2)
  })
})
