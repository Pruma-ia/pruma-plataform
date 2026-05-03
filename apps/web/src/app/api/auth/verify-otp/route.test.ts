import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks (vi.hoisted ensures availability before vi.mock factory) ─────────────

const mockAuth = vi.hoisted(() => vi.fn())
const mockVerifyOtp = vi.hoisted(() => vi.fn())
const mockOtpVerifyRatelimit = vi.hoisted(() => ({ limit: vi.fn() }))

vi.mock("@/lib/auth", () => ({ auth: mockAuth }))
vi.mock("@/lib/otp", () => ({ verifyOtp: mockVerifyOtp }))
vi.mock("@/lib/ratelimit", () => ({ otpVerifyRatelimit: mockOtpVerifyRatelimit }))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(body: object) {
  return new Request("http://localhost/api/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function makeInvalidJsonRequest() {
  return new Request("http://localhost/api/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "invalid json",
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/auth/verify-otp", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    // Default: authenticated session
    mockAuth.mockResolvedValue({ user: { id: "user-123" } })
    // Default: ratelimit passes
    mockOtpVerifyRatelimit.limit.mockResolvedValue({ success: true })
  })

  it("retorna 401 quando sessão não existe", async () => {
    mockAuth.mockResolvedValue(null)
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ code: "123456" }))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe("unauthorized")
  })

  it("retorna 401 quando sessão não tem user.id", async () => {
    mockAuth.mockResolvedValue({ user: {} })
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ code: "123456" }))
    expect(res.status).toBe(401)
  })

  it("retorna 429 quando ratelimit excedido", async () => {
    mockOtpVerifyRatelimit.limit.mockResolvedValue({ success: false })
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ code: "123456" }))
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.error).toBe("rate_limited")
  })

  it("retorna 400 para JSON inválido", async () => {
    const { POST } = await import("./route")
    const res = await POST(makeInvalidJsonRequest())
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("invalid_json")
  })

  it("retorna 400 para código com menos de 6 dígitos", async () => {
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ code: "12345" }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("invalid_code")
  })

  it("retorna 400 para código com letras", async () => {
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ code: "12345a" }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("invalid_code")
  })

  it("retorna 200 quando verifyOtp retorna ok", async () => {
    mockVerifyOtp.mockResolvedValue("ok")
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ code: "123456" }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it("retorna 400 quando verifyOtp retorna wrong", async () => {
    mockVerifyOtp.mockResolvedValue("wrong")
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ code: "000000" }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("wrong")
  })

  it("retorna 410 quando verifyOtp retorna expired", async () => {
    mockVerifyOtp.mockResolvedValue("expired")
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ code: "123456" }))
    expect(res.status).toBe(410)
    const body = await res.json()
    expect(body.error).toBe("expired")
  })

  it("retorna 400 quando verifyOtp retorna no-token", async () => {
    mockVerifyOtp.mockResolvedValue("no-token")
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ code: "123456" }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("no_token")
  })

  it("chama verifyOtp com o userId da sessão (não do body)", async () => {
    mockVerifyOtp.mockResolvedValue("ok")
    const { POST } = await import("./route")
    await POST(makeRequest({ code: "654321" }))
    expect(mockVerifyOtp).toHaveBeenCalledWith("user-123", "654321")
  })

  it("chama otpVerifyRatelimit.limit com o userId da sessão", async () => {
    mockVerifyOtp.mockResolvedValue("ok")
    const { POST } = await import("./route")
    await POST(makeRequest({ code: "123456" }))
    expect(mockOtpVerifyRatelimit.limit).toHaveBeenCalledWith("user-123")
  })
})
