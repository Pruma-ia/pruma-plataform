import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// ─── Mocks (hoisted — must be available before module factory runs) ──────────

const mockLimitFn = vi.hoisted(() => vi.fn())

const MockRatelimit = vi.hoisted(() => {
  const ctor = vi.fn().mockImplementation(({ prefix }: { prefix: string }) => ({
    prefix,
    limit: mockLimitFn,
  }))
  ;(ctor as unknown as Record<string, unknown>).slidingWindow = vi.fn(
    (tokens: number, window: string) => ({ type: "slidingWindow", tokens, window }),
  )
  ;(ctor as unknown as Record<string, unknown>).fixedWindow = vi.fn(
    (tokens: number, window: string) => ({ type: "fixedWindow", tokens, window }),
  )
  return ctor
})

const MockRedis = vi.hoisted(() =>
  vi.fn().mockImplementation(() => ({ _mock: true })),
)

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: MockRatelimit,
}))

vi.mock("@upstash/redis", () => ({
  Redis: MockRedis,
}))

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ratelimit module", () => {
  const ORIGINAL_ENV = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    // Reset env to clean state
    process.env = { ...ORIGINAL_ENV }
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  // ── Test 1: all 4 exports exist ─────────────────────────────────────────────

  it("exports all 4 ratelimit singletons", async () => {
    const mod = await import("./ratelimit")

    expect(mod).toHaveProperty("authRatelimit")
    expect(mod).toHaveProperty("billingRatelimit")
    expect(mod).toHaveProperty("otpVerifyRatelimit")
    expect(mod).toHaveProperty("otpResendRatelimit")
  })

  // ── Test 2: no-op fallback when Upstash env vars are missing ────────────────

  it("returns success:true no-op when UPSTASH_REDIS_REST_URL is empty", async () => {
    // Arrange: no env vars set (done in beforeEach)
    const { authRatelimit } = await import("./ratelimit")

    // Act
    const result = await authRatelimit.limit("127.0.0.1")

    // Assert
    expect(result.success).toBe(true)
  })

  it("no-op fallback does not instantiate Redis when env vars missing", async () => {
    await import("./ratelimit")

    expect(MockRedis).not.toHaveBeenCalled()
  })

  it("no-op limiter returns correct shape { success, limit, remaining, reset }", async () => {
    const { billingRatelimit } = await import("./ratelimit")

    const result = await billingRatelimit.limit("test-key")

    expect(result).toEqual({ success: true, limit: 0, remaining: 0, reset: 0 })
  })

  it("all 4 limiters are no-ops when Upstash not configured", async () => {
    const { authRatelimit, billingRatelimit, otpVerifyRatelimit, otpResendRatelimit } =
      await import("./ratelimit")

    const results = await Promise.all([
      authRatelimit.limit("key"),
      billingRatelimit.limit("key"),
      otpVerifyRatelimit.limit("key"),
      otpResendRatelimit.limit("key"),
    ])

    for (const r of results) {
      expect(r.success).toBe(true)
    }
  })

  // ── Test 3: with Upstash configured — Ratelimit constructor called with correct prefixes

  it("instantiates Redis and Ratelimit with prefix 'pruma:auth' when env vars are set", async () => {
    // Arrange
    process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io"
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token"

    // Act
    await import("./ratelimit")

    // Assert: Redis instantiated once
    expect(MockRedis).toHaveBeenCalledOnce()
    expect(MockRedis).toHaveBeenCalledWith({
      url: "https://test.upstash.io",
      token: "test-token",
    })

    // Assert: Ratelimit constructed with prefix "pruma:auth"
    const calls = MockRatelimit.mock.calls as Array<[{ prefix: string }]>
    const prefixes = calls.map(([opts]) => opts.prefix)
    expect(prefixes).toContain("pruma:auth")
  })

  it("uses all 4 distinct prefixes when Upstash env vars are configured", async () => {
    // Arrange
    process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io"
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token"

    // Act
    await import("./ratelimit")

    // Assert
    const calls = MockRatelimit.mock.calls as Array<[{ prefix: string }]>
    const prefixes = calls.map(([opts]) => opts.prefix)

    expect(prefixes).toContain("pruma:auth")
    expect(prefixes).toContain("pruma:billing")
    expect(prefixes).toContain("pruma:otp-verify")
    expect(prefixes).toContain("pruma:otp-resend")
  })

  it("configures authRatelimit with slidingWindow(20, '60 s')", async () => {
    // Arrange
    process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io"
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token"

    // Act
    await import("./ratelimit")

    // Assert: slidingWindow called with correct args
    expect(MockRatelimit.slidingWindow).toHaveBeenCalledWith(20, "60 s")
  })

  it("configures billingRatelimit with fixedWindow(5, '60 s')", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io"
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token"

    await import("./ratelimit")

    expect(MockRatelimit.fixedWindow).toHaveBeenCalledWith(5, "60 s")
  })

  it("configures otpVerifyRatelimit with fixedWindow(5, '15 m')", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io"
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token"

    await import("./ratelimit")

    expect(MockRatelimit.fixedWindow).toHaveBeenCalledWith(5, "15 m")
  })

  it("configures otpResendRatelimit with fixedWindow(3, '60 m')", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io"
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token"

    await import("./ratelimit")

    expect(MockRatelimit.fixedWindow).toHaveBeenCalledWith(3, "60 m")
  })

  // ── Test 4: .limit() delegates to Ratelimit when Upstash is configured ──────

  it("delegates .limit() call to Ratelimit instance when Upstash configured", async () => {
    // Arrange
    process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io"
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token"

    mockLimitFn.mockResolvedValueOnce({
      success: false,
      limit: 20,
      remaining: 0,
      reset: Date.now() + 60_000,
    })

    const { authRatelimit } = await import("./ratelimit")

    // Act
    const result = await authRatelimit.limit("1.2.3.4")

    // Assert
    expect(mockLimitFn).toHaveBeenCalledWith("1.2.3.4")
    expect(result.success).toBe(false)
    expect(result.limit).toBe(20)
  })
})
