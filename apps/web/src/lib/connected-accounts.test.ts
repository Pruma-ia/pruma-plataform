/**
 * Unit tests — getConnectedAccounts(userId)
 * Mocks db to avoid infrastructure; no real DB.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const mockDbSelectAccounts = vi.hoisted(() => vi.fn())
const mockDbSelectUsers = vi.hoisted(() => vi.fn())

// We track which select call is which via call count
let selectCallCount = 0

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn().mockImplementation(() => {
      selectCallCount++
      if (selectCallCount % 2 === 1) {
        // First call per pair = accounts query
        return {
          from: vi.fn().mockReturnValue({
            where: mockDbSelectAccounts,
          }),
        }
      } else {
        // Second call per pair = users query
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: mockDbSelectUsers,
            }),
          }),
        }
      }
    }),
  },
}))

vi.mock("drizzle-orm", () => ({
  eq: (col: unknown, val: unknown) => ({ col, val }),
}))

vi.mock("../../db/schema", () => ({
  accounts: { userId: "accounts.userId", provider: "accounts.provider", providerAccountId: "accounts.providerAccountId" },
  users: { id: "users.id", password: "users.password" },
}))

import { getConnectedAccounts } from "./connected-accounts"

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  selectCallCount = 0
})

// ── Helpers ────────────────────────────────────────────────────────────────────

function mockResult(oauthRows: Array<{ provider: string; providerAccountId: string }>, password: string | null) {
  // Promise.all calls both queries in parallel — we use mockResolvedValueOnce on the respective mocks
  mockDbSelectAccounts.mockResolvedValueOnce(oauthRows)
  mockDbSelectUsers.mockResolvedValueOnce([{ password }])
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("getConnectedAccounts", () => {
  it("returns only OAuth account when user has no password", async () => {
    mockResult([{ provider: "google", providerAccountId: "google-123" }], null)
    const result = await getConnectedAccounts("user-1")
    expect(result).toEqual([{ provider: "google", providerAccountId: "google-123" }])
  })

  it("returns Google + credentials when user has password set", async () => {
    mockResult(
      [{ provider: "google", providerAccountId: "google-abc" }],
      "hashed-password"
    )
    const result = await getConnectedAccounts("user-1")
    expect(result).toHaveLength(2)
    expect(result).toContainEqual({ provider: "credentials", providerAccountId: "user-1" })
    expect(result).toContainEqual({ provider: "google", providerAccountId: "google-abc" })
  })

  it("returns only credentials entry when user has password but no OAuth", async () => {
    mockResult([], "hashed-password")
    const result = await getConnectedAccounts("user-1")
    expect(result).toEqual([{ provider: "credentials", providerAccountId: "user-1" }])
  })

  it("returns empty array when user has neither OAuth nor password", async () => {
    mockResult([], null)
    const result = await getConnectedAccounts("user-1")
    expect(result).toEqual([])
  })

  it("sorts results alphabetically by provider then by providerAccountId", async () => {
    mockResult(
      [
        { provider: "google", providerAccountId: "g-222" },
        { provider: "azure-ad", providerAccountId: "a-111" },
      ],
      "hashed"
    )
    const result = await getConnectedAccounts("user-1")
    // credentials comes after azure-ad alphabetically
    expect(result[0].provider).toBe("azure-ad")
    expect(result[1].provider).toBe("credentials")
    expect(result[2].provider).toBe("google")
  })
})
