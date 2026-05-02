import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// Module-level singletons — NEVER instantiate per-request (avoids cold-start reconnect overhead)
const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN

const redis = hasUpstash
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null

type LimitResult = { success: boolean; limit: number; remaining: number; reset: number }

function makeLimiter(
  limiter: ReturnType<typeof Ratelimit.slidingWindow> | ReturnType<typeof Ratelimit.fixedWindow>,
  prefix: string,
): { limit: (key: string) => Promise<LimitResult> } {
  if (!redis) {
    // Dev fallback when Upstash not configured — no-op passes every request through
    return {
      limit: async (): Promise<LimitResult> => ({ success: true, limit: 0, remaining: 0, reset: 0 }),
    }
  }
  return new Ratelimit({ redis, limiter, prefix })
}

// Replaces authRateMap (proxy.ts): 20 req/min per IP
export const authRatelimit = makeLimiter(
  Ratelimit.slidingWindow(20, "60 s"),
  "pruma:auth",
)

// Replaces billingRateMap (proxy.ts): 5 req/min per IP
export const billingRatelimit = makeLimiter(
  Ratelimit.fixedWindow(5, "60 s"),
  "pruma:billing",
)

// OTP verify endpoint — 5 req/15min per userId (brute-force protection per AUTH-01)
export const otpVerifyRatelimit = makeLimiter(
  Ratelimit.fixedWindow(5, "15 m"),
  "pruma:otp-verify",
)

// OTP resend endpoint — 3 req/hour per userId (per AUTH-02 + D-04)
export const otpResendRatelimit = makeLimiter(
  Ratelimit.fixedWindow(3, "60 m"),
  "pruma:otp-resend",
)
