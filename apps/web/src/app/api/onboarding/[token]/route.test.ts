import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks ─────────────────────────────────────────────────────────────────────

let selectCallCount = 0
const mockTokenRows = vi.fn()
const mockOrgRows = vi.fn()
const mockUpdate = vi.fn()

vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => {
            selectCallCount++
            if (selectCallCount === 1) return mockTokenRows()
            return mockOrgRows()
          },
        }),
      }),
    }),
    update: () => ({ set: () => ({ where: mockUpdate }) }),
  },
}))

vi.mock("drizzle-orm", () => ({ eq: vi.fn() }))
vi.mock("../../../../../db/schema", () => ({ onboardingTokens: {}, organizations: {} }))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(token: string) {
  return new Request(`http://localhost/api/onboarding/${token}`)
}

function makeParams(token: string) {
  return { params: Promise.resolve({ token }) }
}

function makeValidRecord(overrides: object = {}) {
  return {
    id: "tok-1",
    organizationId: "org-1",
    usedAt: null,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1h no futuro
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/onboarding/[token]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallCount = 0
    process.env.N8N_WEBHOOK_SECRET = "webhook-secret-test"
    process.env.NEXTAUTH_URL = "https://app.test.pruma.ia"
    mockUpdate.mockResolvedValue([])
  })

  it("retorna 400 quando token não começa com 'pruma_ot_'", async () => {
    const { GET } = await import("./route")
    const res = await GET(makeRequest("invalid-token"), makeParams("invalid-token"))
    expect(res.status).toBe(400)
  })

  it("retorna 400 para token com prefixo parcial", async () => {
    const { GET } = await import("./route")
    const res = await GET(makeRequest("pruma_abc123"), makeParams("pruma_abc123"))
    expect(res.status).toBe(400)
  })

  it("retorna 404 quando token hash não encontrado no banco", async () => {
    mockTokenRows.mockResolvedValue([])
    const { GET } = await import("./route")
    const res = await GET(makeRequest("pruma_ot_abc123"), makeParams("pruma_ot_abc123"))
    expect(res.status).toBe(404)
  })

  it("retorna 410 quando token já foi utilizado", async () => {
    mockTokenRows.mockResolvedValue([makeValidRecord({ usedAt: new Date("2026-01-01") })])
    const { GET } = await import("./route")
    const res = await GET(makeRequest("pruma_ot_abc123"), makeParams("pruma_ot_abc123"))
    expect(res.status).toBe(410)
  })

  it("retorna 410 quando token expirado", async () => {
    mockTokenRows.mockResolvedValue([makeValidRecord({ expiresAt: new Date("2025-01-01") })])
    const { GET } = await import("./route")
    const res = await GET(makeRequest("pruma_ot_abc123"), makeParams("pruma_ot_abc123"))
    expect(res.status).toBe(410)
  })

  it("retorna 404 quando organização não encontrada", async () => {
    mockTokenRows.mockResolvedValue([makeValidRecord()])
    mockOrgRows.mockResolvedValue([])
    const { GET } = await import("./route")
    const res = await GET(makeRequest("pruma_ot_abc123"), makeParams("pruma_ot_abc123"))
    expect(res.status).toBe(404)
  })

  it("retorna 200 com credenciais e marca token como usado", async () => {
    mockTokenRows.mockResolvedValue([makeValidRecord()])
    mockOrgRows.mockResolvedValue([{ n8nSlug: "acme", slug: "acme-corp" }])
    const { GET } = await import("./route")
    const res = await GET(makeRequest("pruma_ot_abc123"), makeParams("pruma_ot_abc123"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.organizationSlug).toBe("acme")  // n8nSlug tem precedência
    expect(body.n8nSecret).toBe("webhook-secret-test")
    expect(body.apiUrl).toBe("https://app.test.pruma.ia")
    expect(mockUpdate).toHaveBeenCalled()
  })

  it("usa slug como fallback quando n8nSlug é null", async () => {
    mockTokenRows.mockResolvedValue([makeValidRecord()])
    mockOrgRows.mockResolvedValue([{ n8nSlug: null, slug: "acme-corp" }])
    const { GET } = await import("./route")
    const res = await GET(makeRequest("pruma_ot_abc123"), makeParams("pruma_ot_abc123"))
    const body = await res.json()
    expect(body.organizationSlug).toBe("acme-corp")
  })

  it("retorna string vazia para n8nSecret quando N8N_WEBHOOK_SECRET não configurado", async () => {
    delete process.env.N8N_WEBHOOK_SECRET
    mockTokenRows.mockResolvedValue([makeValidRecord()])
    mockOrgRows.mockResolvedValue([{ n8nSlug: "acme", slug: "acme" }])
    const { GET } = await import("./route")
    const res = await GET(makeRequest("pruma_ot_abc123"), makeParams("pruma_ot_abc123"))
    const body = await res.json()
    expect(body.n8nSecret).toBe("")
  })

  it("retorna apiUrl padrão quando NEXTAUTH_URL não configurado", async () => {
    delete process.env.NEXTAUTH_URL
    mockTokenRows.mockResolvedValue([makeValidRecord()])
    mockOrgRows.mockResolvedValue([{ n8nSlug: "acme", slug: "acme" }])
    const { GET } = await import("./route")
    const res = await GET(makeRequest("pruma_ot_abc123"), makeParams("pruma_ot_abc123"))
    const body = await res.json()
    expect(body.apiUrl).toBe("https://app.pruma.ia")
  })
})
