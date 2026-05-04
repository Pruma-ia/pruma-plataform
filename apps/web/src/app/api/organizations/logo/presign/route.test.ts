import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST } from "./route"

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock("@/lib/auth", () => ({ auth: mockAuth }))

const mockBuildOrgLogoR2Key = vi.hoisted(() => vi.fn())
const mockPresignUploadUrl = vi.hoisted(() => vi.fn())
vi.mock("@/lib/r2", () => ({
  LOGO_ALLOWED_MIME_TYPES: new Set(["image/png", "image/jpeg", "image/webp"]),
  MAX_LOGO_SIZE_BYTES: 2 * 1024 * 1024,
  buildOrgLogoR2Key: mockBuildOrgLogoR2Key,
  presignUploadUrl: mockPresignUploadUrl,
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: "user-123",
      organizationId: "org-abc",
      role: "owner",
      ...overrides,
    },
  }
}

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/organizations/logo/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/organizations/logo/presign", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockBuildOrgLogoR2Key.mockReturnValue("org-logos/org-abc/uuid/logo.png")
    mockPresignUploadUrl.mockResolvedValue("https://r2.example.com/presigned?sig=abc")
  })

  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await POST(makeRequest({ filename: "logo.png", mimeType: "image/png", sizeBytes: 1024 }))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe("unauthorized")
  })

  it("returns 400 when session has no organizationId", async () => {
    mockAuth.mockResolvedValue(makeSession({ organizationId: undefined }))
    const res = await POST(makeRequest({ filename: "logo.png", mimeType: "image/png", sizeBytes: 1024 }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("no_organization")
  })

  it("returns 403 when role is 'member'", async () => {
    mockAuth.mockResolvedValue(makeSession({ role: "member" }))
    const res = await POST(makeRequest({ filename: "logo.png", mimeType: "image/png", sizeBytes: 1024 }))
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe("forbidden")
  })

  it("returns 403 when role is 'viewer'", async () => {
    mockAuth.mockResolvedValue(makeSession({ role: "viewer" }))
    const res = await POST(makeRequest({ filename: "logo.png", mimeType: "image/png", sizeBytes: 1024 }))
    expect(res.status).toBe(403)
  })

  it("returns 400 for malformed JSON", async () => {
    mockAuth.mockResolvedValue(makeSession())
    const req = new Request("http://localhost/api/organizations/logo/presign", {
      method: "POST",
      body: "not-json",
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("invalid_json")
  })

  it("returns 400 when sizeBytes exceeds MAX_LOGO_SIZE_BYTES", async () => {
    mockAuth.mockResolvedValue(makeSession())
    const res = await POST(makeRequest({
      filename: "logo.png",
      mimeType: "image/png",
      sizeBytes: 3 * 1024 * 1024, // 3MB > 2MB limit
    }))
    expect(res.status).toBe(400)
  })

  it("returns 422 when mimeType is 'image/gif' (excluded per D-18)", async () => {
    mockAuth.mockResolvedValue(makeSession())
    const res = await POST(makeRequest({ filename: "logo.gif", mimeType: "image/gif", sizeBytes: 1024 }))
    expect(res.status).toBe(422)
  })

  it("returns 422 when mimeType is 'application/pdf'", async () => {
    mockAuth.mockResolvedValue(makeSession())
    const res = await POST(makeRequest({ filename: "doc.pdf", mimeType: "application/pdf", sizeBytes: 1024 }))
    expect(res.status).toBe(422)
  })

  it("returns 200 with correct response shape for owner with valid PNG", async () => {
    mockAuth.mockResolvedValue(makeSession({ role: "owner" }))
    const res = await POST(makeRequest({ filename: "logo.png", mimeType: "image/png", sizeBytes: 1024 }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty("uploadUrl")
    expect(json).toHaveProperty("r2Key")
    expect(json).toHaveProperty("expiresAt")
    expect(json.uploadUrl).toBe("https://r2.example.com/presigned?sig=abc")
    expect(json.r2Key).toMatch(/^org-logos\//)
    expect(typeof json.expiresAt).toBe("string")
  })

  it("calls presignUploadUrl with r2Key starting with 'org-logos/' + orgId", async () => {
    mockAuth.mockResolvedValue(makeSession({ role: "owner" }))
    mockBuildOrgLogoR2Key.mockReturnValue("org-logos/org-abc/uuid-123/logo.png")
    await POST(makeRequest({ filename: "logo.png", mimeType: "image/png", sizeBytes: 1024 }))
    expect(mockPresignUploadUrl).toHaveBeenCalledWith(
      expect.stringMatching(/^org-logos\/org-abc\//),
      "image/png",
      1024,
    )
  })

  it("returns 200 for admin role", async () => {
    mockAuth.mockResolvedValue(makeSession({ role: "admin" }))
    const res = await POST(makeRequest({ filename: "logo.png", mimeType: "image/png", sizeBytes: 1024 }))
    expect(res.status).toBe(200)
  })
})
