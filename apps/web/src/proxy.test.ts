/**
 * Unit tests for proxy.ts middleware
 *
 * Tests verify:
 * - Upstash Ratelimit singletons (authRatelimit, billingRatelimit) are called correctly
 * - emailVerified gate redirects unverified users to /verify-email
 * - Bypass paths are not blocked by the gate
 * - config.matcher includes all required paths
 *
 * Auth strategy: mock `auth` from `@/lib/auth` to return a wrapped function that
 * receives a synthetic NextRequest-like object with `auth` property populated.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextResponse, type NextRequest } from "next/server"

// ─── Mocks (hoisted — must be declared before vi.mock factory runs) ──────────

const mockAuthRatelimitFn = vi.hoisted(() => vi.fn())
const mockBillingRatelimitFn = vi.hoisted(() => vi.fn())

// Default: both limiters allow requests
mockAuthRatelimitFn.mockResolvedValue({ success: true, limit: 20, remaining: 19, reset: 0 })
mockBillingRatelimitFn.mockResolvedValue({ success: true, limit: 5, remaining: 4, reset: 0 })

vi.mock("@/lib/ratelimit", () => ({
  authRatelimit: { limit: mockAuthRatelimitFn },
  billingRatelimit: { limit: mockBillingRatelimitFn },
}))

// Mock `auth` from `@/lib/auth`.
// NextAuth v5 `auth(handler)` wraps the handler: it calls handler(req) where req.auth = session.
// We replicate that: our mock captures the handler and exposes a `callWith(req, session)` helper
// so each test can simulate different session states.
let capturedHandler: ((req: NextRequest) => unknown) | null = null

vi.mock("@/lib/auth", () => ({
  auth: vi.fn((handler: (req: NextRequest) => unknown) => {
    capturedHandler = handler
    // The actual export from auth() is the wrapped middleware function.
    // We return a passthrough that callers never invoke directly in these tests.
    return handler
  }),
}))

// ─── Helper: build a synthetic request ───────────────────────────────────────

type SessionUser = {
  isSuperAdmin?: boolean
  organizationId?: string
  emailVerified?: boolean
  subscriptionStatus?: "active" | "trial" | "past_due" | "canceled" | "inactive"
}

function makeReq(
  pathname: string,
  session: SessionUser | null,
  ip = "1.2.3.4",
): NextRequest & { auth: SessionUser | null } {
  const url = new URL(pathname, "http://localhost:3000")
  const req = new Request(url, {
    headers: { "x-forwarded-for": ip },
  }) as unknown as NextRequest & { auth: SessionUser | null }
  // NextAuth v5 attaches .auth to req inside the wrapper
  Object.defineProperty(req, "nextUrl", { value: url })
  req.auth = session ? { ...session } : null
  return req
}

// ─── Import proxy.ts to register the handler ─────────────────────────────────
// We import the whole module to trigger the `auth(handler)` call, capturing the handler.

async function getHandler() {
  // Reset module registry so mocks are fresh per describe block if needed
  const mod = await import("./proxy")
  return { handler: capturedHandler!, config: mod.config }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("proxy.ts middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset default mock behaviors
    mockAuthRatelimitFn.mockResolvedValue({ success: true, limit: 20, remaining: 19, reset: 0 })
    mockBillingRatelimitFn.mockResolvedValue({ success: true, limit: 5, remaining: 4, reset: 0 })
  })

  // ── Test a: rate limited /api/auth/* → 429 ───────────────────────────────────

  it("a — returns 429 when authRatelimit.limit() returns success:false on auth route", async () => {
    mockAuthRatelimitFn.mockResolvedValueOnce({ success: false, limit: 20, remaining: 0, reset: 0 })

    const { handler } = await getHandler()

    const req = makeReq("/api/auth/signin", null)
    const res = await handler(req)

    expect((res as Response).status).toBe(429)
    expect(mockAuthRatelimitFn).toHaveBeenCalledWith("1.2.3.4")
  })

  // ── Test b: not rate limited → continues ────────────────────────────────────

  it("b — continues (next()) when authRatelimit.limit() returns success:true", async () => {
    mockAuthRatelimitFn.mockResolvedValueOnce({ success: true, limit: 20, remaining: 19, reset: 0 })

    const { handler } = await getHandler()

    const req = makeReq("/api/auth/signin", null)
    const res = await handler(req)

    // No session → no redirect; expect NextResponse.next() (status 200 with no redirect)
    expect((res as Response).status).not.toBe(429)
  })

  // ── Test c: billing route uses billingRatelimit, NOT authRatelimit ────────────

  it("c — billing route /api/billing/checkout calls billingRatelimit, not authRatelimit", async () => {
    const { handler } = await getHandler()

    const req = makeReq("/api/billing/checkout", {
      isSuperAdmin: false,
      organizationId: "org-1",
      emailVerified: true,
      subscriptionStatus: "active",
    })
    await handler(req)

    expect(mockBillingRatelimitFn).toHaveBeenCalledWith("1.2.3.4")
    expect(mockAuthRatelimitFn).not.toHaveBeenCalled()
  })

  // ── Test d: emailVerified=false + org set + /dashboard → redirect to /verify-email ──

  it("d — unverified user with org accessing /dashboard is redirected to /verify-email", async () => {
    const { handler } = await getHandler()

    const req = makeReq("/dashboard", {
      isSuperAdmin: false,
      organizationId: "org-1",
      emailVerified: false,
    })
    const res = await handler(req)

    const location = (res as Response).headers.get("location")
    expect((res as Response).status).toBeGreaterThanOrEqual(300)
    expect((res as Response).status).toBeLessThan(400)
    expect(location).toContain("/verify-email")
  })

  // ── Test e: emailVerified=false + /verify-email → does NOT redirect ──────────

  it("e — unverified user on /verify-email is NOT redirected (no infinite loop)", async () => {
    const { handler } = await getHandler()

    const req = makeReq("/verify-email", {
      isSuperAdmin: false,
      organizationId: "org-1",
      emailVerified: false,
    })
    const res = await handler(req)

    const location = (res as Response).headers.get("location")
    // Must not redirect to /verify-email (would be a loop)
    // Should return next() — status 200 or no location header pointing to verify-email
    expect(location).not.toContain("/verify-email")
  })

  // ── Test f: emailVerified=false + /api/auth/verify-otp → does NOT redirect ──

  it("f — unverified user on /api/auth/verify-otp is NOT redirected", async () => {
    const { handler } = await getHandler()

    const req = makeReq("/api/auth/verify-otp", {
      isSuperAdmin: false,
      organizationId: "org-1",
      emailVerified: false,
    })
    const res = await handler(req)

    const location = (res as Response).headers.get("location")
    expect(location).not.toContain("/verify-email")
  })

  // ── Test g: emailVerified=false + /api/auth/resend-otp → does NOT redirect ──

  it("g — unverified user on /api/auth/resend-otp is NOT redirected", async () => {
    const { handler } = await getHandler()

    const req = makeReq("/api/auth/resend-otp", {
      isSuperAdmin: false,
      organizationId: "org-1",
      emailVerified: false,
    })
    const res = await handler(req)

    const location = (res as Response).headers.get("location")
    expect(location).not.toContain("/verify-email")
  })

  // ── Test h: emailVerified=true + /verify-email → redirect to /dashboard ─────

  it("h — verified user visiting /verify-email is bounced to /dashboard", async () => {
    const { handler } = await getHandler()

    const req = makeReq("/verify-email", {
      isSuperAdmin: false,
      organizationId: "org-1",
      emailVerified: true,
    })
    const res = await handler(req)

    const location = (res as Response).headers.get("location")
    expect(location).toContain("/dashboard")
  })

  // ── Test i: emailVerified=false + no org → onboarding guard fires first ──────

  it("i — unverified user with no org is redirected to /onboarding (not /verify-email)", async () => {
    const { handler } = await getHandler()

    const req = makeReq("/dashboard", {
      isSuperAdmin: false,
      organizationId: undefined,
      emailVerified: false,
    })
    const res = await handler(req)

    const location = (res as Response).headers.get("location")
    expect(location).toContain("/onboarding")
    expect(location).not.toContain("/verify-email")
  })

  // ── Test j: isSuperAdmin=true + emailVerified=false → NOT redirected ─────────

  it("j — superadmin with emailVerified=false is NOT redirected to /verify-email", async () => {
    const { handler } = await getHandler()

    const req = makeReq("/dashboard", {
      isSuperAdmin: true,
      organizationId: undefined,
      emailVerified: false,
    })
    const res = await handler(req)

    const location = (res as Response).headers.get("location")
    expect(location).not.toContain("/verify-email")
  })

  // ── Test k: no session + /dashboard → no emailVerified redirect ──────────────

  it("k — no session accessing /dashboard is NOT redirected to /verify-email (no gate trigger)", async () => {
    const { handler } = await getHandler()

    const req = makeReq("/dashboard", null)
    const res = await handler(req)

    const location = (res as Response).headers.get("location")
    expect(location).not.toContain("/verify-email")
  })

  // ── Test l: config.matcher contains required paths ────────────────────────────

  it("l — config.matcher includes /verify-email, /api/auth/verify-otp, /api/auth/resend-otp", async () => {
    const { config } = await getHandler()

    expect(config.matcher).toContain("/verify-email")
    // OTP endpoints should be explicitly listed or covered by /api/auth/:path*
    const matcherStr = config.matcher.join(",")
    expect(matcherStr).toContain("/api/auth/verify-otp")
    expect(matcherStr).toContain("/api/auth/resend-otp")
  })
})
