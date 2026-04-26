import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockAuth = vi.fn()
vi.mock("@/lib/auth", () => ({ auth: mockAuth }))

const mockValidateCallback = vi.fn()
vi.mock("@/lib/n8n", () => ({ validateCallbackUrl: mockValidateCallback }))

// PATCH: select(1)=orgExists, select(2)=slugConflict
// GET:   select(1)=org
let selectCallCount = 0
const mockOrgExistsRows = vi.fn()
const mockSlugConflictRows = vi.fn()
const mockUpdate = vi.fn()

vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => {
            selectCallCount++
            if (selectCallCount === 1) return mockOrgExistsRows()
            return mockSlugConflictRows()
          },
        }),
      }),
    }),
    update: () => ({ set: () => ({ where: mockUpdate }) }),
  },
}))

vi.mock("drizzle-orm", () => ({ eq: vi.fn() }))
vi.mock("../../../../../../../db/schema", () => ({ organizations: {} }))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePatch(body: object, orgId = "org-1") {
  return new Request(`http://localhost/api/admin/orgs/${orgId}/integrations`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function makeGet(orgId = "org-1") {
  return new Request(`http://localhost/api/admin/orgs/${orgId}/integrations`)
}

function makeParams(orgId = "org-1") {
  return { params: Promise.resolve({ orgId }) }
}

// ── PATCH tests ────────────────────────────────────────────────────────────────

describe("PATCH /api/admin/orgs/[orgId]/integrations", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallCount = 0
    mockValidateCallback.mockReturnValue(true)
    mockOrgExistsRows.mockResolvedValue([{ id: "org-1" }])
    mockSlugConflictRows.mockResolvedValue([])
    mockUpdate.mockResolvedValue([])
  })

  it("retorna 403 quando não é superadmin", async () => {
    mockAuth.mockResolvedValue({ user: { isSuperAdmin: false } })
    const { PATCH } = await import("./route")
    const res = await PATCH(makePatch({ n8nSlug: "acme" }), makeParams())
    expect(res.status).toBe(403)
  })

  it("retorna 403 quando sessão nula", async () => {
    mockAuth.mockResolvedValue(null)
    const { PATCH } = await import("./route")
    const res = await PATCH(makePatch({ n8nSlug: "acme" }), makeParams())
    expect(res.status).toBe(403)
  })

  it("retorna 400 quando body é inválido (slug com maiúsculas)", async () => {
    mockAuth.mockResolvedValue({ user: { isSuperAdmin: true } })
    const { PATCH } = await import("./route")
    const res = await PATCH(makePatch({ n8nSlug: "Acme Corp" }), makeParams())
    expect(res.status).toBe(400)
  })

  it("retorna 400 quando nenhum campo enviado", async () => {
    mockAuth.mockResolvedValue({ user: { isSuperAdmin: true } })
    const { PATCH } = await import("./route")
    const res = await PATCH(makePatch({}), makeParams())
    expect(res.status).toBe(400)
  })

  it("retorna 422 quando n8nBaseUrl aponta para rede privada", async () => {
    mockAuth.mockResolvedValue({ user: { isSuperAdmin: true } })
    mockValidateCallback.mockReturnValue(false)
    const { PATCH } = await import("./route")
    const res = await PATCH(makePatch({ n8nBaseUrl: "https://192.168.1.1" }), makeParams())
    expect(res.status).toBe(422)
  })

  it("retorna 404 quando org não encontrada", async () => {
    mockAuth.mockResolvedValue({ user: { isSuperAdmin: true } })
    mockOrgExistsRows.mockResolvedValue([])
    const { PATCH } = await import("./route")
    const res = await PATCH(makePatch({ n8nBaseUrl: "https://n8n.acme.com" }), makeParams("ghost-org"))
    expect(res.status).toBe(404)
  })

  it("retorna 409 quando n8nSlug já está em uso por outra org", async () => {
    mockAuth.mockResolvedValue({ user: { isSuperAdmin: true } })
    mockSlugConflictRows.mockResolvedValue([{ id: "other-org" }])
    const { PATCH } = await import("./route")
    const res = await PATCH(makePatch({ n8nSlug: "taken" }), makeParams())
    expect(res.status).toBe(409)
  })

  it("retorna 200 ao atualizar n8nSlug válido", async () => {
    mockAuth.mockResolvedValue({ user: { isSuperAdmin: true } })
    const { PATCH } = await import("./route")
    const res = await PATCH(makePatch({ n8nSlug: "new-slug" }), makeParams())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(mockUpdate).toHaveBeenCalled()
  })

  it("retorna 200 ao atualizar só n8nBaseUrl (sem SELECT de slug)", async () => {
    mockAuth.mockResolvedValue({ user: { isSuperAdmin: true } })
    const { PATCH } = await import("./route")
    const res = await PATCH(makePatch({ n8nBaseUrl: "https://n8n.acme.com" }), makeParams())
    expect(res.status).toBe(200)
  })
})

// ── GET tests ──────────────────────────────────────────────────────────────────

describe("GET /api/admin/orgs/[orgId]/integrations", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallCount = 0
  })

  it("retorna 403 quando não é superadmin", async () => {
    mockAuth.mockResolvedValue({ user: { isSuperAdmin: false } })
    const { GET } = await import("./route")
    const res = await GET(makeGet(), makeParams())
    expect(res.status).toBe(403)
  })

  it("retorna 404 quando org não encontrada", async () => {
    mockAuth.mockResolvedValue({ user: { isSuperAdmin: true } })
    mockOrgExistsRows.mockResolvedValue([])
    const { GET } = await import("./route")
    const res = await GET(makeGet("ghost"), makeParams("ghost"))
    expect(res.status).toBe(404)
  })

  it("retorna 200 com n8nSlug e n8nBaseUrl da org", async () => {
    mockAuth.mockResolvedValue({ user: { isSuperAdmin: true } })
    mockOrgExistsRows.mockResolvedValue([{
      n8nSlug: "acme",
      n8nBaseUrl: "https://n8n.acme.com",
      name: "Acme Corp",
      slug: "acme-corp",
    }])
    const { GET } = await import("./route")
    const res = await GET(makeGet(), makeParams())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.n8nSlug).toBe("acme")
    expect(body.n8nBaseUrl).toBe("https://n8n.acme.com")
  })
})
