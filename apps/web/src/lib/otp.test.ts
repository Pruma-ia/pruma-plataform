import { describe, it, expect, vi, beforeEach } from "vitest"

// ── DB mock ───────────────────────────────────────────────────────────────────

const mockDelete = vi.fn()
const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockUpdate = vi.fn()
const mockTransaction = vi.fn()

vi.mock("@/lib/db", () => ({
  db: {
    delete: () => ({ where: () => Promise.resolve(mockDelete()) }),
    insert: () => ({ values: () => Promise.resolve(mockInsert()) }),
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: () => Promise.resolve(mockSelect()),
          }),
        }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => Promise.resolve(mockUpdate()),
      }),
    }),
    transaction: (fn: (tx: unknown) => Promise<unknown>) => mockTransaction(fn),
  },
}))

vi.mock("drizzle-orm", () => ({
  and: vi.fn(),
  desc: vi.fn(),
  eq: vi.fn(),
  isNull: vi.fn(),
}))

vi.mock("../../db/schema", () => ({
  emailOtpTokens: {},
  users: {},
}))

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("$2b$10$hashedvalue"),
    compare: vi.fn(),
  },
}))

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("generateAndStoreOtp", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        delete: () => ({ where: () => Promise.resolve(mockDelete()) }),
        insert: () => ({ values: () => Promise.resolve(mockInsert()) }),
      }
      return fn(tx)
    })
  })

  it("retorna string numérica de 6 dígitos", async () => {
    mockDelete.mockReturnValue(undefined)
    mockInsert.mockReturnValue(undefined)

    const { generateAndStoreOtp } = await import("./otp")
    const code = await generateAndStoreOtp("user-123")
    expect(code).toMatch(/^\d{6}$/)
  })

  it("código é >= 100000 e <= 999999", async () => {
    mockDelete.mockReturnValue(undefined)
    mockInsert.mockReturnValue(undefined)

    const { generateAndStoreOtp } = await import("./otp")
    const code = await generateAndStoreOtp("user-123")
    const num = parseInt(code, 10)
    expect(num).toBeGreaterThanOrEqual(100_000)
    expect(num).toBeLessThanOrEqual(999_999)
  })

  it("chama delete antes de insert (delete-then-insert para resend-safe)", async () => {
    const deleteOrder: string[] = []
    mockDelete.mockImplementation(() => {
      deleteOrder.push("delete")
      return undefined
    })
    mockInsert.mockImplementation(() => {
      deleteOrder.push("insert")
      return undefined
    })

    const { generateAndStoreOtp } = await import("./otp")
    await generateAndStoreOtp("user-456")
    expect(deleteOrder[0]).toBe("delete")
    expect(deleteOrder[1]).toBe("insert")
  })
})

describe("verifyOtp", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it("retorna 'no-token' quando não há registro não-utilizado", async () => {
    mockSelect.mockReturnValue([])
    const { verifyOtp } = await import("./otp")
    const result = await verifyOtp("user-123", "123456")
    expect(result).toBe("no-token")
  })

  it("retorna 'expired' quando expiresAt está no passado", async () => {
    const pastDate = new Date(Date.now() - 1000)
    mockSelect.mockReturnValue([
      { id: "token-1", tokenHash: "$2b$10$hash", expiresAt: pastDate, usedAt: null },
    ])
    const { verifyOtp } = await import("./otp")
    const result = await verifyOtp("user-123", "123456")
    expect(result).toBe("expired")
  })

  it("retorna 'wrong' quando bcrypt.compare retorna false", async () => {
    const futureDate = new Date(Date.now() + 15 * 60 * 1000)
    mockSelect.mockReturnValue([
      { id: "token-1", tokenHash: "$2b$10$hash", expiresAt: futureDate, usedAt: null },
    ])
    const bcrypt = await import("bcryptjs")
    vi.mocked(bcrypt.default.compare).mockResolvedValue(false as never)

    const { verifyOtp } = await import("./otp")
    const result = await verifyOtp("user-123", "999999")
    expect(result).toBe("wrong")
  })

  it("retorna 'ok' e executa transaction com updates em usedAt e emailVerified", async () => {
    const futureDate = new Date(Date.now() + 15 * 60 * 1000)
    mockSelect.mockReturnValue([
      { id: "token-1", tokenHash: "$2b$10$hash", expiresAt: futureDate, usedAt: null },
    ])
    const bcrypt = await import("bcryptjs")
    vi.mocked(bcrypt.default.compare).mockResolvedValue(true as never)

    let transactionFnCalled = false
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        update: () => ({
          set: () => ({
            where: () => Promise.resolve(undefined),
          }),
        }),
      }
      await fn(tx)
      transactionFnCalled = true
    })

    const { verifyOtp } = await import("./otp")
    const result = await verifyOtp("user-123", "123456")
    expect(result).toBe("ok")
    expect(transactionFnCalled).toBe(true)
  })
})

describe("getLatestOtpCreatedAt", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it("retorna null quando não há registros", async () => {
    mockSelect.mockReturnValue([])
    const { getLatestOtpCreatedAt } = await import("./otp")
    const result = await getLatestOtpCreatedAt("user-123")
    expect(result).toBeNull()
  })

  it("retorna a data createdAt do registro mais recente", async () => {
    const createdAt = new Date("2026-05-01T12:00:00Z")
    mockSelect.mockReturnValue([{ createdAt }])
    const { getLatestOtpCreatedAt } = await import("./otp")
    const result = await getLatestOtpCreatedAt("user-123")
    expect(result).toEqual(createdAt)
  })
})
