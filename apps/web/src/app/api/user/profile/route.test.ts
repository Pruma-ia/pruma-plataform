/**
 * Unit tests — PATCH /api/user/profile
 * Mocks auth + db; does NOT hit infrastructure.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const mockAuth = vi.hoisted(() => vi.fn())
const mockDbUpdate = vi.hoisted(() => vi.fn())
const mockSet = vi.hoisted(() => vi.fn())
const mockWhere = vi.hoisted(() => vi.fn())

vi.mock("@/lib/auth", () => ({ auth: mockAuth }))

vi.mock("@/lib/db", () => ({
  db: {
    update: mockDbUpdate,
  },
}))

vi.mock("drizzle-orm", () => ({
  eq: (col: unknown, val: unknown) => ({ col, val }),
}))

vi.mock("../../../../../db/schema", () => ({
  users: {
    id: "users.id",
    name: "users.name",
  },
}))

// ── Import SUT after mocks ─────────────────────────────────────────────────────

import { PATCH } from "./route"

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/user/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function makeInvalidJsonRequest() {
  return new Request("http://localhost/api/user/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: "{invalid-json",
  })
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()

  // Default: authenticated session
  mockAuth.mockResolvedValue({ user: { id: "user-123" } })

  // Chainable db mock: db.update().set().where()
  mockWhere.mockResolvedValue(undefined)
  mockSet.mockReturnValue({ where: mockWhere })
  mockDbUpdate.mockReturnValue({ set: mockSet })
})

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("PATCH /api/user/profile", () => {
  describe("authentication", () => {
    it("returns 401 when no session", async () => {
      mockAuth.mockResolvedValue(null)
      const res = await PATCH(makeRequest({ name: "Marcelo" }))
      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe("unauthorized")
    })

    it("returns 401 when session has no user.id", async () => {
      mockAuth.mockResolvedValue({ user: {} })
      const res = await PATCH(makeRequest({ name: "Marcelo" }))
      expect(res.status).toBe(401)
    })
  })

  describe("input validation", () => {
    it("returns 400 for invalid JSON", async () => {
      const res = await PATCH(makeInvalidJsonRequest())
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe("invalid_json")
    })

    it("returns 400 for empty string name", async () => {
      const res = await PATCH(makeRequest({ name: "" }))
      expect(res.status).toBe(400)
    })

    it("returns 400 for whitespace-only name", async () => {
      const res = await PATCH(makeRequest({ name: "   " }))
      expect(res.status).toBe(400)
    })

    it("returns 400 for name longer than 120 characters", async () => {
      const res = await PATCH(makeRequest({ name: "a".repeat(121) }))
      expect(res.status).toBe(400)
    })

    it("returns 400 when name field is missing", async () => {
      const res = await PATCH(makeRequest({}))
      expect(res.status).toBe(400)
    })
  })

  describe("successful update", () => {
    it("returns 200 { ok: true } for valid name", async () => {
      const res = await PATCH(makeRequest({ name: "Marcelo" }))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.ok).toBe(true)
    })

    it("trims whitespace from name before calling db.update", async () => {
      await PATCH(makeRequest({ name: "  Marcelo  " }))
      expect(mockSet).toHaveBeenCalledWith({ name: "Marcelo" })
    })

    it("scopes db.update to session.user.id (never a userId from body)", async () => {
      await PATCH(makeRequest({ name: "Marcelo" }))
      // where() called with eq(users.id, session.user.id)
      expect(mockWhere).toHaveBeenCalledWith(
        expect.objectContaining({ val: "user-123" })
      )
    })

    it("does NOT use body.userId or body.id to scope the update", async () => {
      // Even if attacker sends a userId in body, only session.user.id is used
      await PATCH(makeRequest({ name: "Marcelo", userId: "attacker-id", id: "attacker-id" }))
      expect(mockWhere).toHaveBeenCalledWith(
        expect.objectContaining({ val: "user-123" })
      )
      // Ensure db.update was NOT called with attacker-id
      const whereCall = mockWhere.mock.calls[0][0]
      expect(whereCall.val).not.toBe("attacker-id")
    })
  })
})
