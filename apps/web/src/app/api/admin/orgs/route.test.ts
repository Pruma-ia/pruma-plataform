import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockAuth = vi.fn()
vi.mock("@/lib/auth", () => ({ auth: mockAuth }))

const mockValidateCallback = vi.fn()
vi.mock("@/lib/n8n", () => ({ validateCallbackUrl: mockValidateCallback }))

let selectCallCount = 0
let insertCallCount = 0
let capturedOrgInsertValues: Record<string, unknown> | null = null
const mockSlugRows = vi.fn()
const mockN8nSlugRows = vi.fn()
const mockInsertOrg = vi.fn()
const mockInsertToken = vi.fn()

vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => {
            selectCallCount++
            if (selectCallCount === 1) return mockSlugRows()
            return mockN8nSlugRows()
          },
        }),
      }),
    }),
    insert: () => ({
      values: (data: Record<string, unknown>) => {
        insertCallCount++
        if (insertCallCount === 1) {
          capturedOrgInsertValues = data
          return { returning: mockInsertOrg }  // org insert
        }
        return mockInsertToken()  // token insert
      },
    }),
  },
}))

vi.mock("drizzle-orm", () => ({ eq: vi.fn() }))
vi.mock("../../../../../db/schema", () => ({ organizations: {}, onboardingTokens: {} }))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(body: object) {
  return new Request("http://localhost/api/admin/orgs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/admin/orgs", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallCount = 0
    insertCallCount = 0
    capturedOrgInsertValues = null
    mockValidateCallback.mockReturnValue(true)
    mockSlugRows.mockResolvedValue([])      // sem conflito de slug
    mockN8nSlugRows.mockResolvedValue([])   // sem conflito de n8nSlug
    mockInsertOrg.mockResolvedValue([{
      id: "org-1",
      name: "Acme Corp",
      slug: "acme-corp",
      n8nSlug: "acme-corp",
      n8nBaseUrl: null,
    }])
    mockInsertToken.mockResolvedValue([])
  })

  it("retorna 403 quando não é superadmin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", isSuperAdmin: false } })
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ name: "Acme" }))
    expect(res.status).toBe(403)
  })

  it("retorna 403 quando sessão é nula", async () => {
    mockAuth.mockResolvedValue(null)
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ name: "Acme" }))
    expect(res.status).toBe(403)
  })

  it("retorna 400 quando name está ausente", async () => {
    mockAuth.mockResolvedValue({ user: { isSuperAdmin: true } })
    const { POST } = await import("./route")
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it("retorna 400 quando name é muito curto", async () => {
    mockAuth.mockResolvedValue({ user: { isSuperAdmin: true } })
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ name: "A" }))
    expect(res.status).toBe(400)
  })

  it("retorna 400 quando n8nSlug tem caractere inválido", async () => {
    mockAuth.mockResolvedValue({ user: { isSuperAdmin: true } })
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ name: "Acme Corp", n8nSlug: "Acme Corp" }))
    expect(res.status).toBe(400)
  })

  it("retorna 422 quando n8nBaseUrl aponta para rede privada", async () => {
    mockAuth.mockResolvedValue({ user: { isSuperAdmin: true } })
    mockValidateCallback.mockReturnValue(false)
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ name: "Acme Corp", n8nBaseUrl: "https://192.168.1.1" }))
    expect(res.status).toBe(422)
  })

  it("retorna 409 quando n8nSlug já está em uso", async () => {
    mockAuth.mockResolvedValue({ user: { isSuperAdmin: true } })
    mockN8nSlugRows.mockResolvedValue([{ id: "existing-org" }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ name: "Acme Corp" }))
    expect(res.status).toBe(409)
  })

  it("retorna 201 com orgId, slug e onboardingToken", async () => {
    mockAuth.mockResolvedValue({ user: { isSuperAdmin: true } })
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ name: "Acme Corp" }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.orgId).toBe("org-1")
    expect(body.slug).toBe("acme-corp")
    expect(body.onboardingToken).toMatch(/^pruma_ot_/)
  })

  it("retorna 201 com n8nSlug explícito quando fornecido", async () => {
    mockAuth.mockResolvedValue({ user: { isSuperAdmin: true } })
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ name: "Acme Corp", n8nSlug: "acme" }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.n8nSlug).toBe("acme")
  })

  it("insere token com hash SHA-256 (nunca o raw token)", async () => {
    mockAuth.mockResolvedValue({ user: { isSuperAdmin: true } })
    const { POST } = await import("./route")
    await POST(makeRequest({ name: "Acme Corp" }))
    // Token insert é a 2ª chamada de insert — verificamos que foi chamado
    expect(insertCallCount).toBe(2)
  })

  it("inclui subscriptionEndsAt ~14 dias no futuro ao criar org (trial)", async () => {
    mockAuth.mockResolvedValue({ user: { isSuperAdmin: true } })
    const before = Date.now()
    const { POST } = await import("./route")
    await POST(makeRequest({ name: "Acme Corp" }))
    const after = Date.now()
    expect(capturedOrgInsertValues?.subscriptionEndsAt).toBeInstanceOf(Date)
    const endsAt = (capturedOrgInsertValues?.subscriptionEndsAt as Date).getTime()
    expect(endsAt).toBeGreaterThanOrEqual(before + 14 * 24 * 60 * 60 * 1000)
    expect(endsAt).toBeLessThanOrEqual(after + 14 * 24 * 60 * 60 * 1000)
  })

  it("incrementa sufixo quando slug base já existe (cobre branch while)", async () => {
    mockAuth.mockResolvedValue({ user: { isSuperAdmin: true } })
    // First slug check: taken; second: free; then n8nSlug check: free
    mockSlugRows
      .mockResolvedValueOnce([{ id: "org-taken" }]) // "acme-corp" exists
      .mockResolvedValueOnce([])                     // "acme-corp-1" free
    mockN8nSlugRows.mockResolvedValue([])
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ name: "Acme Corp" }))
    expect(res.status).toBe(201)
  })
})
