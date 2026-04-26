import { describe, it, expect, vi, beforeEach } from "vitest"

const mockSelect = vi.fn()
const mockUpdate = vi.fn()
let selectCallCount = 0
let updateCallCount = 0

vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => {
            selectCallCount++
            return Promise.resolve(mockSelect())
          },
        }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => {
          updateCallCount++
          return Promise.resolve(mockUpdate())
        },
      }),
    }),
  },
}))

vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), gt: vi.fn(), isNull: vi.fn() }))
vi.mock("../../../../../db/schema", () => ({ passwordResetTokens: {}, users: {} }))
vi.mock("bcryptjs", () => ({ default: { hash: vi.fn().mockResolvedValue("hashed-new-pw") } }))

function makeRequest(body: object) {
  return new Request("http://localhost/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    selectCallCount = 0
    updateCallCount = 0
  })

  it("retorna 400 para payload inválido", async () => {
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ token: "", password: "abc" }))
    expect(res.status).toBe(400)
  })

  it("retorna 400 para token inválido/expirado", async () => {
    mockSelect.mockReturnValue([])
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ token: "invalid-token", password: "newpassword123" }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/inválido|expirado/)
  })

  it("redefine senha com token válido", async () => {
    mockSelect.mockReturnValue([{ id: "token-1", userId: "user-123" }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ token: "valid-token", password: "Secure!Pass1" }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(updateCallCount).toBe(2) // users + passwordResetTokens
  })

  it("retorna 400 para senha curta", async () => {
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ token: "tok", password: "short" }))
    expect(res.status).toBe(400)
  })
})
