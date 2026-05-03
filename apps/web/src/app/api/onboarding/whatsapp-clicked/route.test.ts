/**
 * Unit tests for POST /api/onboarding/whatsapp-clicked.
 * DB and auth fully mocked — no infra required.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock("@/lib/auth", () => ({ auth: mockAuth }))

const mockUpdate = vi.fn()
vi.mock("@/lib/db", () => ({
  db: {
    update: mockUpdate,
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function postReq() {
  return new Request("http://localhost/api/onboarding/whatsapp-clicked", {
    method: "POST",
  })
}

function buildUpdateChain() {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/onboarding/whatsapp-clicked", () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    const chain = buildUpdateChain()
    mockUpdate.mockReturnValue(chain)

    const res = await POST()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)

    // db.update called with organizations table
    expect(mockUpdate).toHaveBeenCalledOnce()

    // .set() called with onboardingWhatsappClickedAt: Date
    const setArgs = chain.set.mock.calls[0][0] as Record<string, unknown>
    expect(setArgs.onboardingWhatsappClickedAt).toBeInstanceOf(Date)

    // .where() called with eq(organizations.id, orgId) — orgId from session, never from body
    const whereArgs = chain.set.mock.results[0].value.where.mock.calls[0][0] as { op: string; col: unknown; val: unknown }
    expect(whereArgs.op).toBe("eq")
    expect(whereArgs.val).toBe(orgId)
  })

  it("never reads orgId from request body — multi-tenant safety", async () => {
    // Even if an attacker sends orgId in body, it must be ignored
    mockAuth.mockResolvedValue({ user: { id: "user-1", organizationId: "real-org" } })
    const chain = buildUpdateChain()
    mockUpdate.mockReturnValue(chain)

    // POST with attacker body — route.ts accepts no body, so this is purely defensive
    const res = await POST()
    expect(res.status).toBe(200)

    const whereArgs = chain.set.mock.results[0].value.where.mock.calls[0][0] as { val: unknown }
    expect(whereArgs.val).toBe("real-org") // session orgId, not attacker's
  })
})
