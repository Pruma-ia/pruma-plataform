import { describe, it, expect, vi, beforeEach } from "vitest"

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockDelete = vi.fn()
const mockSendEmail = vi.fn()

vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({ limit: () => Promise.resolve(mockSelect()) }),
      }),
    }),
    insert: () => ({
      values: () => Promise.resolve(mockInsert()),
    }),
    delete: () => ({
      where: () => Promise.resolve(mockDelete()),
    }),
  },
}))

vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), gt: vi.fn() }))
vi.mock("../../../../../db/schema", () => ({ users: {}, passwordResetTokens: {} }))
vi.mock("@/lib/email", () => ({ sendPasswordResetEmail: mockSendEmail }))
vi.mock("crypto", async () => {
  const actual = await vi.importActual<typeof import("crypto")>("crypto")
  return {
    ...actual,
    randomBytes: () => Buffer.from("a".repeat(32)),
  }
})

function makeRequest(body: object) {
  return new Request("http://localhost/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockSendEmail.mockResolvedValue(undefined)
  })

  it("retorna 200 com ok:true mesmo para e-mail inválido (anti-enumeration)", async () => {
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ email: "not-an-email" }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it("retorna 200 para e-mail inexistente (anti-enumeration)", async () => {
    mockSelect.mockReturnValue([])
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ email: "nao@existe.com" }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(mockInsert).not.toHaveBeenCalled()
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it("cria token e envia e-mail para e-mail válido existente", async () => {
    mockSelect.mockReturnValue([{ id: "user-123" }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ email: "valid@test.com" }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(mockInsert).toHaveBeenCalled()
    expect(mockSendEmail).toHaveBeenCalledWith("valid@test.com", expect.stringContaining("/reset-password?token="))
  })

  it("retorna 200 mesmo quando sendEmail lança exceção (falha silenciosa)", async () => {
    mockSelect.mockReturnValue([{ id: "user-123" }])
    mockSendEmail.mockRejectedValue(new Error("SMTP down"))
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ email: "valid@test.com" }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
  })
})
