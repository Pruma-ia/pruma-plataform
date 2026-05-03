import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockAuth = vi.hoisted(() => vi.fn())
const mockGenerateAndStoreOtp = vi.hoisted(() => vi.fn())
const mockGetLatestOtpCreatedAt = vi.hoisted(() => vi.fn())
const mockOtpResendRatelimit = vi.hoisted(() => ({ limit: vi.fn() }))
const mockSendEmail = vi.hoisted(() => vi.fn())
const mockDbSelect = vi.hoisted(() => vi.fn())

vi.mock("@/lib/auth", () => ({ auth: mockAuth }))
vi.mock("@/lib/otp", () => ({
  generateAndStoreOtp: mockGenerateAndStoreOtp,
  getLatestOtpCreatedAt: mockGetLatestOtpCreatedAt,
}))
vi.mock("@/lib/ratelimit", () => ({ otpResendRatelimit: mockOtpResendRatelimit }))
vi.mock("@/lib/email", () => ({ sendEmail: mockSendEmail }))
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve(mockDbSelect()),
        }),
      }),
    }),
  },
}))
vi.mock("drizzle-orm", () => ({ eq: vi.fn() }))
vi.mock("../../../../../db/schema", () => ({ users: {} }))

// ── Tests ─────────────────────────────────────────────────────────────────────

function makeRequest() {
  return new Request("http://localhost/api/auth/resend-otp", {
    method: "POST",
  })
}

describe("POST /api/auth/resend-otp", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    // Default: authenticated session
    mockAuth.mockResolvedValue({ user: { id: "user-123" } })
    // Default: ratelimit passes
    mockOtpResendRatelimit.limit.mockResolvedValue({ success: true })
    // Default: no previous OTP (no cooldown)
    mockGetLatestOtpCreatedAt.mockResolvedValue(null)
    // Default: user found
    mockDbSelect.mockReturnValue([{ email: "test@example.com" }])
    // Default: OTP generated
    mockGenerateAndStoreOtp.mockResolvedValue("654321")
    // Default: email sent
    mockSendEmail.mockResolvedValue(undefined)
  })

  it("retorna 401 quando sessão não existe", async () => {
    mockAuth.mockResolvedValue(null)
    const { POST } = await import("./route")
    const res = await POST()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe("unauthorized")
  })

  it("retorna 401 quando sessão não tem user.id", async () => {
    mockAuth.mockResolvedValue({ user: {} })
    const { POST } = await import("./route")
    const res = await POST()
    expect(res.status).toBe(401)
  })

  it("retorna 429 quando ratelimit excedido", async () => {
    mockOtpResendRatelimit.limit.mockResolvedValue({ success: false })
    const { POST } = await import("./route")
    const res = await POST()
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.error).toBe("rate_limited")
  })

  it("retorna 429 com retryAfterSeconds quando cooldown ativo (< 60s desde último)", async () => {
    // Último OTP enviado há 30 segundos
    const thirtySecondsAgo = new Date(Date.now() - 30_000)
    mockGetLatestOtpCreatedAt.mockResolvedValue(thirtySecondsAgo)
    const { POST } = await import("./route")
    const res = await POST()
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.error).toBe("cooldown")
    expect(body.retryAfterSeconds).toBeGreaterThan(0)
    expect(body.retryAfterSeconds).toBeLessThanOrEqual(30)
  })

  it("não aplica cooldown quando último OTP foi há mais de 60s", async () => {
    const ninetySecondsAgo = new Date(Date.now() - 90_000)
    mockGetLatestOtpCreatedAt.mockResolvedValue(ninetySecondsAgo)
    const { POST } = await import("./route")
    const res = await POST()
    expect(res.status).toBe(200)
  })

  it("retorna 404 quando usuário não encontrado no banco", async () => {
    mockDbSelect.mockReturnValue([])
    const { POST } = await import("./route")
    const res = await POST()
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe("user_not_found")
  })

  it("retorna 200 com ok:true no caminho de sucesso", async () => {
    const { POST } = await import("./route")
    const res = await POST()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it("chama generateAndStoreOtp com o userId da sessão", async () => {
    const { POST } = await import("./route")
    await POST()
    expect(mockGenerateAndStoreOtp).toHaveBeenCalledWith("user-123")
  })

  it("chama sendEmail com o email do usuário e o código gerado", async () => {
    const { POST } = await import("./route")
    await POST()
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "test@example.com",
      })
    )
  })

  it("chama otpResendRatelimit.limit com o userId da sessão", async () => {
    const { POST } = await import("./route")
    await POST()
    expect(mockOtpResendRatelimit.limit).toHaveBeenCalledWith("user-123")
  })
})
