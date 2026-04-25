import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockValidateCallback = vi.fn()
vi.mock("@/lib/n8n", () => ({ validateCallbackUrl: mockValidateCallback }))

const mockSelectPending = vi.fn()
const mockSelectFiles = vi.fn()
const mockUpdate = vi.fn()
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        leftJoin: () => ({ where: () => ({ limit: mockSelectPending }) }),
        where: () => mockSelectFiles(),
      }),
    }),
    update: () => ({ set: () => ({ where: mockUpdate }) }),
  },
}))

vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), lt: vi.fn(), isNotNull: vi.fn(), sql: vi.fn(), inArray: vi.fn() }))
vi.mock("../../../../../db/schema", () => ({ approvals: {}, users: {}, approvalFiles: {} }))

// ── Helpers ───────────────────────────────────────────────────────────────────

const SECRET = "secret123"

function makeRequest(secret?: string) {
  const headers: Record<string, string> = {}
  if (secret !== undefined) headers["x-maintenance-secret"] = secret
  return new Request("http://localhost/api/maintenance/retry-failed-callbacks", { headers })
}

function makeApproval(overrides: object = {}) {
  return {
    id: "appr-1",
    callbackUrl: "https://n8n.example.com/webhook/abc",
    callbackRetries: 0,
    status: "approved",
    comment: null,
    decisionValues: null,
    resolvedAt: new Date(),
    resolverEmail: "resolver@example.com",
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/maintenance/retry-failed-callbacks", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.MAINTENANCE_SECRET = SECRET
    mockValidateCallback.mockReturnValue(true)
    mockUpdate.mockResolvedValue([])
    mockSelectPending.mockResolvedValue([])
    mockSelectFiles.mockResolvedValue([])
    global.fetch = vi.fn().mockResolvedValue({ ok: true })
  })

  afterEach(() => {
    process.env.MAINTENANCE_SECRET = SECRET
  })

  it("retorna 401 sem header de autenticação", async () => {
    const { GET } = await import("./route")
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it("retorna 401 quando secret incorreto (mesmo tamanho)", async () => {
    const { GET } = await import("./route")
    const res = await GET(makeRequest("secretXXX")) // 9 chars, same as SECRET
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

  it("retorna 200 com processed:0 quando não há callbacks pendentes", async () => {
    mockSelectPending.mockResolvedValue([])
    const { GET } = await import("./route")
    const res = await GET(makeRequest(SECRET))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.processed).toBe(0)
    expect(body.sent).toBe(0)
  })

  it("marca 'sent' quando callback bem-sucedido", async () => {
    mockSelectPending.mockResolvedValue([makeApproval({ callbackRetries: 0 })])
    global.fetch = vi.fn().mockResolvedValue({ ok: true })
    const { GET } = await import("./route")
    const res = await GET(makeRequest(SECRET))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sent).toBe(1)
    expect(body.failed).toBe(0)
    expect(body.exhausted).toBe(0)
  })

  it("mantém 'failed' quando callback falha e retries < MAX_RETRIES", async () => {
    mockSelectPending.mockResolvedValue([makeApproval({ callbackRetries: 2 })]) // nextRetries=3 < 5
    global.fetch = vi.fn().mockResolvedValue({ ok: false })
    const { GET } = await import("./route")
    const res = await GET(makeRequest(SECRET))
    const body = await res.json()
    expect(body.failed).toBe(1)
    expect(body.exhausted).toBe(0)
    expect(body.sent).toBe(0)
  })

  it("marca 'exhausted' quando callback falha na última tentativa (MAX_RETRIES)", async () => {
    mockSelectPending.mockResolvedValue([makeApproval({ callbackRetries: 4 })]) // nextRetries=5 = MAX_RETRIES
    global.fetch = vi.fn().mockResolvedValue({ ok: false })
    const { GET } = await import("./route")
    const res = await GET(makeRequest(SECRET))
    const body = await res.json()
    expect(body.exhausted).toBe(1)
    expect(body.failed).toBe(0)
  })

  it("marca 'blocked' quando callbackUrl falha validação SSRF", async () => {
    mockValidateCallback.mockReturnValue(false)
    mockSelectPending.mockResolvedValue([makeApproval({ callbackUrl: "https://169.254.169.254/webhook" })])
    const { GET } = await import("./route")
    const res = await GET(makeRequest(SECRET))
    const body = await res.json()
    expect(body.blocked).toBe(1)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("retorna contagens combinadas para múltiplas aprovações", async () => {
    mockSelectPending.mockResolvedValue([
      makeApproval({ id: "a1", callbackRetries: 0 }),
      makeApproval({ id: "a2", callbackRetries: 4 }),
    ])
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true })   // a1 → sent
      .mockResolvedValueOnce({ ok: false })  // a2 → exhausted
    const { GET } = await import("./route")
    const res = await GET(makeRequest(SECRET))
    const body = await res.json()
    expect(body.processed).toBe(2)
    expect(body.sent).toBe(1)
    expect(body.exhausted).toBe(1)
    expect(body.failed).toBe(0)
  })

  it("inclui retried:true e status no payload do callback", async () => {
    mockSelectPending.mockResolvedValue([makeApproval({
      id: "appr-1",
      status: "approved",
      comment: "ok",
      resolvedAt: new Date("2026-01-01T00:00:00Z"),
    })])
    const { GET } = await import("./route")
    await GET(makeRequest(SECRET))
    const callBody = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
    expect(callBody.retried).toBe(true)
    expect(callBody.approvalId).toBe("appr-1")
    expect(callBody.status).toBe("approved")
    expect(callBody.comment).toBe("ok")
    expect(callBody.resolvedBy).toBe("resolver@example.com")
  })

  it("inclui files e decisionValues no payload do retry callback", async () => {
    const decisionValues = { foro: "trt2", advogado: "adv_marcos" }
    const file = { approvalId: "appr-1", r2Key: "org/uuid/doc.pdf", filename: "doc.pdf", mimeType: "application/pdf", sizeBytes: 1024 }
    mockSelectPending.mockResolvedValue([makeApproval({ id: "appr-1", decisionValues })])
    mockSelectFiles.mockResolvedValue([file])
    const { GET } = await import("./route")
    await GET(makeRequest(SECRET))
    const callBody = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
    expect(callBody.decisionValues).toEqual(decisionValues)
    expect(callBody.files).toHaveLength(1)
    expect(callBody.files[0].r2Key).toBe("org/uuid/doc.pdf")
    expect(callBody.files[0].filename).toBe("doc.pdf")
  })

  it("envia resolvedBy:null quando resolver não encontrado (LEFT JOIN miss)", async () => {
    mockSelectPending.mockResolvedValue([makeApproval({ resolverEmail: null })])
    const { GET } = await import("./route")
    await GET(makeRequest(SECRET))
    const callBody = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
    expect(callBody.resolvedBy).toBeNull()
  })

  it("não dispara callback quando callbackUrl é nula (guard interno)", async () => {
    mockSelectPending.mockResolvedValue([makeApproval({ callbackUrl: null })])
    const { GET } = await import("./route")
    await GET(makeRequest(SECRET))
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
