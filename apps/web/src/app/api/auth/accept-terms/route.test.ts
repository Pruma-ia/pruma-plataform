import { describe, it, expect, vi, beforeEach } from "vitest"

const mockAuth = vi.hoisted(() => vi.fn())
const mockUpdate = vi.fn()

vi.mock("@/lib/auth", () => ({ auth: mockAuth }))
vi.mock("@/lib/db", () => ({
  db: {
    update: () => ({
      set: () => ({
        where: () => Promise.resolve(),
      }),
    }),
  },
}))
vi.mock("drizzle-orm", () => ({ eq: vi.fn() }))
vi.mock("../../../../../db/schema", () => ({ users: {} }))

function makeRequest(body: object) {
  return new Request("http://localhost/api/auth/accept-terms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("POST /api/auth/accept-terms", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("retorna 401 quando não autenticado", async () => {
    mockAuth.mockResolvedValue(null)
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ marketingConsent: false }))
    expect(res.status).toBe(401)
  })

  it("retorna 400 quando body inválido", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } })
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ marketingConsent: "not-a-boolean" }))
    expect(res.status).toBe(400)
  })

  it("retorna 200 e registra aceite com marketingConsent false", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } })
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ marketingConsent: false }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it("retorna 200 e registra aceite com marketingConsent true", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } })
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ marketingConsent: true }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it("retorna 200 com body vazio (marketingConsent usa default false)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } })
    const { POST } = await import("./route")
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(200)
  })
})
