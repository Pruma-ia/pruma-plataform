import { describe, it, expect, vi, beforeEach } from "vitest"
import { buildR2Key, ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "./r2"

// ── S3 function mocks ─────────────────────────────────────────────────────────
const mockSend = vi.hoisted(() => vi.fn())
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn(() => ({ send: mockSend })),
  PutObjectCommand: vi.fn((args: unknown) => ({ _type: "PutObject", ...args as object })),
  DeleteObjectCommand: vi.fn((args: unknown) => ({ _type: "DeleteObject", ...args as object })),
  GetObjectCommand: vi.fn((args: unknown) => ({ _type: "GetObject", ...args as object })),
  HeadObjectCommand: vi.fn((args: unknown) => ({ _type: "HeadObject", ...args as object })),
}))

const mockGetSignedUrl = vi.hoisted(() => vi.fn())
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: mockGetSignedUrl,
}))

describe("buildR2Key", () => {
  it("prefixes key with orgId", () => {
    const key = buildR2Key("org-123", "invoice.pdf")
    expect(key.startsWith("org-123/")).toBe(true)
  })

  it("includes original filename (sanitized)", () => {
    const key = buildR2Key("org-1", "invoice.pdf")
    expect(key.endsWith("/invoice.pdf")).toBe(true)
  })

  it("sanitizes special characters in filename", () => {
    const key = buildR2Key("org-1", "meu arquivo (1).pdf")
    expect(key).not.toContain(" ")
    expect(key).not.toContain("(")
    expect(key).not.toContain(")")
  })

  it("truncates filename to 100 chars", () => {
    const long = "a".repeat(200) + ".pdf"
    const key = buildR2Key("org-1", long)
    const filename = key.split("/")[2]
    expect(filename!.length).toBeLessThanOrEqual(100)
  })

  it("generates unique keys for same inputs", () => {
    const k1 = buildR2Key("org-1", "file.pdf")
    const k2 = buildR2Key("org-1", "file.pdf")
    expect(k1).not.toBe(k2)
  })

  it("format is {orgId}/{uuid}/{filename}", () => {
    const key = buildR2Key("org-abc", "doc.png")
    const parts = key.split("/")
    expect(parts).toHaveLength(3)
    expect(parts[0]).toBe("org-abc")
    // uuid segment: 36 chars (8-4-4-4-12)
    expect(parts[1]).toMatch(/^[0-9a-f-]{36}$/)
  })
})

describe("ALLOWED_MIME_TYPES", () => {
  it("allows PDF", () => expect(ALLOWED_MIME_TYPES.has("application/pdf")).toBe(true))
  it("allows JPEG", () => expect(ALLOWED_MIME_TYPES.has("image/jpeg")).toBe(true))
  it("allows PNG", () => expect(ALLOWED_MIME_TYPES.has("image/png")).toBe(true))
  it("allows WebP", () => expect(ALLOWED_MIME_TYPES.has("image/webp")).toBe(true))
  it("allows GIF", () => expect(ALLOWED_MIME_TYPES.has("image/gif")).toBe(true))
  it("allows DOCX", () => expect(ALLOWED_MIME_TYPES.has("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe(true))
  it("allows XLSX", () => expect(ALLOWED_MIME_TYPES.has("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).toBe(true))
  it("allows XML", () => expect(ALLOWED_MIME_TYPES.has("application/xml")).toBe(true))
  it("allows CSV", () => expect(ALLOWED_MIME_TYPES.has("text/csv")).toBe(true))
  it("allows ZIP", () => expect(ALLOWED_MIME_TYPES.has("application/zip")).toBe(true))
  it("rejects MP4", () => expect(ALLOWED_MIME_TYPES.has("video/mp4")).toBe(false))
  it("allows plain text", () => expect(ALLOWED_MIME_TYPES.has("text/plain")).toBe(true))
  it("rejects executable", () => expect(ALLOWED_MIME_TYPES.has("application/octet-stream")).toBe(false))
})

describe("MAX_FILE_SIZE_BYTES", () => {
  it("is 10MB", () => expect(MAX_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024))
})

describe("presignUploadUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSignedUrl.mockResolvedValue("https://presigned.upload.url/object?sig=abc")
  })

  it("returns a presigned URL string", async () => {
    const { presignUploadUrl } = await import("./r2")
    const url = await presignUploadUrl("org-1/uuid/file.pdf", "application/pdf", 50000)
    expect(url).toBe("https://presigned.upload.url/object?sig=abc")
    expect(mockGetSignedUrl).toHaveBeenCalledOnce()
  })

  it("passes ContentType and ContentLength to PutObjectCommand", async () => {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3")
    const { presignUploadUrl } = await import("./r2")
    await presignUploadUrl("org/uuid/doc.pdf", "application/pdf", 1024)
    expect(PutObjectCommand).toHaveBeenCalledWith(expect.objectContaining({
      ContentType: "application/pdf",
      ContentLength: 1024,
      Key: "org/uuid/doc.pdf",
    }))
  })
})

describe("presignReadUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSignedUrl.mockResolvedValue("https://presigned.read.url/object?sig=xyz")
  })

  it("returns a presigned read URL string", async () => {
    const { presignReadUrl } = await import("./r2")
    const url = await presignReadUrl("org-1/uuid/file.pdf")
    expect(url).toBe("https://presigned.read.url/object?sig=xyz")
    expect(mockGetSignedUrl).toHaveBeenCalledOnce()
  })

  it("passes r2Key as Key to GetObjectCommand", async () => {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3")
    const { presignReadUrl } = await import("./r2")
    await presignReadUrl("org/uuid/photo.jpg")
    expect(GetObjectCommand).toHaveBeenCalledWith(expect.objectContaining({ Key: "org/uuid/photo.jpg" }))
  })
})

describe("deleteObject", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSend.mockResolvedValue({})
  })

  it("calls client.send with DeleteObjectCommand", async () => {
    const { deleteObject } = await import("./r2")
    await deleteObject("org-1/uuid/file.pdf")
    expect(mockSend).toHaveBeenCalledOnce()
  })
})

describe("objectExists", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns true when HeadObjectCommand succeeds", async () => {
    mockSend.mockResolvedValue({})
    const { objectExists } = await import("./r2")
    expect(await objectExists("org/uuid/exists.pdf")).toBe(true)
  })

  it("returns false when HeadObjectCommand throws (object not found or any error)", async () => {
    mockSend.mockRejectedValue(new Error("NoSuchKey"))
    const { objectExists } = await import("./r2")
    expect(await objectExists("org/uuid/missing.pdf")).toBe(false)
  })
})
