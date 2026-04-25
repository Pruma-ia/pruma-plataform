import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockVerify = vi.fn()
vi.mock("@/lib/n8n", () => ({ verifyN8nSecret: mockVerify }))

const mockSelectRows = vi.fn()
const mockInsert = vi.fn()
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => ({
            then: (fn: (rows: unknown[]) => unknown) => fn(mockSelectRows()),
          }),
        }),
      }),
    }),
    insert: () => ({ values: mockInsert }),
  },
}))

vi.mock("drizzle-orm", () => ({ eq: vi.fn() }))
vi.mock("../../../../../../../db/schema", () => ({
  approvalFileUploads: {},
  organizations: {},
}))

const mockBuildR2Key = vi.fn()
const mockPresignUploadUrl = vi.fn()
vi.mock("@/lib/r2", () => ({
  buildR2Key: mockBuildR2Key,
  presignUploadUrl: mockPresignUploadUrl,
  ALLOWED_MIME_TYPES: new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"]),
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
}))

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(body: object) {
  return new Request("http://localhost/api/n8n/approvals/files/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-n8n-secret": "secret" },
    body: JSON.stringify(body),
  })
}

const validPayload = {
  organizationSlug: "acme",
  filename: "contrato.pdf",
  mimeType: "application/pdf",
  sizeBytes: 512_000,
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/n8n/approvals/files/presign", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockBuildR2Key.mockReturnValue("org-1/uuid-abc/contrato.pdf")
    mockPresignUploadUrl.mockResolvedValue("https://r2.example.com/presigned-put-url")
    mockInsert.mockResolvedValue([])
  })

  it("retorna 401 quando secret inválido", async () => {
    mockVerify.mockReturnValue(false)
    const { POST } = await import("./route")
    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(401)
  })

  it("retorna 400 para payload sem campos obrigatórios", async () => {
    mockVerify.mockReturnValue(true)
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ organizationSlug: "acme" }))
    expect(res.status).toBe(400)
  })

  it("retorna 422 para mimeType não permitido", async () => {
    mockVerify.mockReturnValue(true)
    mockSelectRows.mockReturnValue([{ id: "org-1" }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ ...validPayload, mimeType: "video/mp4" }))
    expect(res.status).toBe(422)
  })

  it("retorna 404 quando org não encontrada", async () => {
    mockVerify.mockReturnValue(true)
    mockSelectRows.mockReturnValue([])
    const { POST } = await import("./route")
    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(404)
  })

  it("retorna 400 para sizeBytes acima do limite (10MB)", async () => {
    mockVerify.mockReturnValue(true)
    mockSelectRows.mockReturnValue([{ id: "org-1" }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ ...validPayload, sizeBytes: 11 * 1024 * 1024 }))
    expect(res.status).toBe(400)
  })

  it("retorna 200 com uploadUrl, r2Key e expiresAt no happy path", async () => {
    mockVerify.mockReturnValue(true)
    mockSelectRows.mockReturnValue([{ id: "org-1" }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.uploadUrl).toBe("https://r2.example.com/presigned-put-url")
    expect(body.r2Key).toBe("org-1/uuid-abc/contrato.pdf")
    expect(body.expiresAt).toBeDefined()
  })

  it("registra upload pendente no banco no happy path", async () => {
    mockVerify.mockReturnValue(true)
    mockSelectRows.mockReturnValue([{ id: "org-1" }])
    const { POST } = await import("./route")
    await POST(makeRequest(validPayload))
    expect(mockInsert).toHaveBeenCalled()
  })
})
