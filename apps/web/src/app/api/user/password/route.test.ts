import { describe, it, expect, vi, beforeEach } from "vitest"

const mockAuth = vi.hoisted(() => vi.fn())
const mockSelect = vi.fn()
const mockUpdate = vi.fn()

vi.mock("@/lib/auth", () => ({ auth: mockAuth }))
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({ limit: () => Promise.resolve(mockSelect()) }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => Promise.resolve(mockUpdate()),
      }),
    }),
  },
}))
vi.mock("drizzle-orm", () => ({ eq: vi.fn() }))
vi.mock("../../../../../db/schema", () => ({ users: {} }))
vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn().mockResolvedValue(true),
    hash: vi.fn().mockResolvedValue("new-hashed"),
  },
}))

function makeRequest(body: object) {
  return new Request("http://localhost/api/user/password", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("PATCH /api/user/password", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it("retorna 401 sem sessão", async () => {
    mockAuth.mockResolvedValue(null)
    const { PATCH } = await import("./route")
    const res = await PATCH(makeRequest({ currentPassword: "old", newPassword: "newpass123" }))
    expect(res.status).toBe(401)
  })

  it("retorna 400 para payload inválido", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } })
    const { PATCH } = await import("./route")
    const res = await PATCH(makeRequest({ currentPassword: "old", newPassword: "short" }))
    expect(res.status).toBe(400)
  })

  it("retorna 400 quando usuário não tem senha (Google OAuth)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockSelect.mockReturnValue([{ password: null }])
    const { PATCH } = await import("./route")
    const res = await PATCH(makeRequest({ currentPassword: "old", newPassword: "newpass123" }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/sem senha|Google/)
  })

  it("retorna 400 para senha atual incorreta", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockSelect.mockReturnValue([{ password: "hashed-old" }])
    const bcrypt = await import("bcryptjs")
    vi.mocked(bcrypt.default.compare).mockResolvedValueOnce(false as never)
    const { PATCH } = await import("./route")
    const res = await PATCH(makeRequest({ currentPassword: "wrong", newPassword: "newpass123" }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/incorreta/)
  })

  it("altera senha com sucesso", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockSelect.mockReturnValue([{ password: "hashed-old" }])
    const { PATCH } = await import("./route")
    const res = await PATCH(makeRequest({ currentPassword: "correct", newPassword: "newpass123" }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
  })
})
