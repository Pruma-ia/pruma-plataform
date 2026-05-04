/**
 * Unit tests for POST /api/onboarding/whatsapp-clicked.
 * DB and auth fully mocked — no infra required.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock("@/lib/auth", () => ({ auth: mockAuth }))

// updateWhere: the inner .where() resolved value — inspected per-test
const mockUpdateWhere = vi.hoisted(() => vi.fn())
const mockUpdateSet = vi.hoisted(() => vi.fn())

vi.mock("@/lib/db", () => ({
  db: {
    update: () => ({
      set: mockUpdateSet,
    }),
  },
}))

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ op: "eq", col, val })),
}))

vi.mock("../../../../../db/schema", () => ({
  organizations: { id: "organizations.id" },
}))

// ── Real import after mocks ───────────────────────────────────────────────────

import { POST } from "./route"

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/onboarding/whatsapp-clicked", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: .set().where() resolves OK
    mockUpdateSet.mockReturnValue({
      where: mockUpdateWhere.mockResolvedValue(undefined),
    })
  })

  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await POST()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe("unauthorized")
  })

  it("returns 401 when session has no user.id", async () => {
    mockAuth.mockResolvedValue({ user: {} })
    const res = await POST()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe("unauthorized")
  })

  it("returns 400 when session exists but organizationId is undefined", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } })
    const res = await POST()
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("no_organization")
  })

  it("returns 400 when organizationId is null", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", organizationId: null } })
    const res = await POST()
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("no_organization")
  })

  it("returns 200 and calls db.update with onboardingWhatsappClickedAt scoped to session orgId", async () => {
    const orgId = "org-abc-123"
    mockAuth.mockResolvedValue({ user: { id: "user-1", organizationId: orgId } })

    const res = await POST()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)

    // .set() called with onboardingWhatsappClickedAt: Date
    expect(mockUpdateSet).toHaveBeenCalledOnce()
    const setArgs = mockUpdateSet.mock.calls[0][0] as Record<string, unknown>
    expect(setArgs.onboardingWhatsappClickedAt).toBeInstanceOf(Date)

    // .where() called with eq(organizations.id, orgId) — orgId from session, never from body
    expect(mockUpdateWhere).toHaveBeenCalledOnce()
    const whereArg = mockUpdateWhere.mock.calls[0][0] as { op: string; val: unknown }
    expect(whereArg.op).toBe("eq")
    expect(whereArg.val).toBe(orgId)
  })

  it("never reads orgId from request body — multi-tenant safety", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", organizationId: "real-org" } })

    const res = await POST()
    expect(res.status).toBe(200)

    const whereArg = mockUpdateWhere.mock.calls[0][0] as { val: unknown }
    expect(whereArg.val).toBe("real-org") // session orgId, not any body field
  })
})
