import { describe, it, expect, vi, beforeEach } from "vitest"
import { PATCH } from "./route"

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock("@/lib/auth", () => ({ auth: mockAuth }))

const mockUpdate = vi.hoisted(() => vi.fn())
const mockSet = vi.hoisted(() => vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })))
mockUpdate.mockReturnValue({ set: mockSet })

vi.mock("@/lib/db", () => ({
  db: { update: mockUpdate },
}))

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val, _type: "eq" })),
}))

vi.mock("../../../../../db/schema", () => ({
  organizations: { id: "id", name: "name", logo: "logo" },
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
  return new Request("http://localhost/api/organizations/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("PATCH /api/organizations/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Re-wire mock chain after clearAllMocks
    const mockWhere = vi.fn().mockResolvedValue(undefined)
    mockSet.mockReturnValue({ where: mockWhere })
    mockUpdate.mockReturnValue({ set: mockSet })
  })

  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await PATCH(makeRequest({ name: "Acme" }))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe("unauthorized")
  })

  it("returns 400 when session has no organizationId", async () => {
    mockAuth.mockResolvedValue(makeSession({ organizationId: undefined }))
    const res = await PATCH(makeRequest({ name: "Acme" }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("no_organization")
  })

  it("returns 403 when role is 'member'", async () => {
    mockAuth.mockResolvedValue(makeSession({ role: "member" }))
    const res = await PATCH(makeRequest({ name: "Acme" }))
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe("forbidden")
  })

  it("returns 400 for empty body (no fields provided — refine fails)", async () => {
    mockAuth.mockResolvedValue(makeSession())
    const res = await PATCH(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it("returns 400 when logo path is from a different org (cross-tenant injection)", async () => {
    mockAuth.mockResolvedValue(makeSession({ organizationId: "org-abc" }))
    const res = await PATCH(makeRequest({ logo: "org-logos/OTHER_ORG/abc/file.png" }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("invalid_logo_path")
  })

  it("returns 200 and calls db.update with { name } only", async () => {
    mockAuth.mockResolvedValue(makeSession())
    const res = await PATCH(makeRequest({ name: "Acme" }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(mockSet).toHaveBeenCalledWith({ name: "Acme" })
  })

  it("returns 200 and calls db.update with { logo } only (valid path)", async () => {
    mockAuth.mockResolvedValue(makeSession({ organizationId: "org-abc" }))
    const validLogo = "org-logos/org-abc/uuid-123/logo.png"
    const res = await PATCH(makeRequest({ logo: validLogo }))
    expect(res.status).toBe(200)
    expect(mockSet).toHaveBeenCalledWith({ logo: validLogo })
  })

  it("returns 200 and calls db.update with { name, logo } both", async () => {
    mockAuth.mockResolvedValue(makeSession({ organizationId: "org-abc" }))
    const validLogo = "org-logos/org-abc/uuid-456/logo.webp"
    const res = await PATCH(makeRequest({ name: "Pruma IA", logo: validLogo }))
    expect(res.status).toBe(200)
    expect(mockSet).toHaveBeenCalledWith({ name: "Pruma IA", logo: validLogo })
  })

  it("returns 200 and calls db.update with { logo: null } to clear logo", async () => {
    mockAuth.mockResolvedValue(makeSession())
    const res = await PATCH(makeRequest({ logo: null }))
    expect(res.status).toBe(200)
    expect(mockSet).toHaveBeenCalledWith({ logo: null })
  })

  it("returns 200 for admin role", async () => {
    mockAuth.mockResolvedValue(makeSession({ role: "admin" }))
    const res = await PATCH(makeRequest({ name: "Test Org" }))
    expect(res.status).toBe(200)
  })
})
