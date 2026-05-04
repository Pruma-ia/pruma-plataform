/**
 * Integration tests — OTP full lifecycle against pruma_db (Docker local)
 *
 * What is REAL:
 *   - PostgreSQL queries against local Docker DB (email_otp_tokens, users tables)
 *   - Full generateAndStoreOtp + verifyOtp roundtrip through real Drizzle ORM
 *   - FK constraints and transactional semantics
 *   - bcrypt hash/compare against real DB rows
 *
 * What is MOCKED:
 *   - Nothing — this is a pure DB integration test
 *
 * Prerequisites:
 *   - Docker `pruma_db` running with migration 0008 applied:
 *     sed 's/-->.*//' db/migrations/0008_silent_susan_delgado.sql |
 *       docker exec -i pruma_db psql -U pruma -d pruma_dev
 */

import { describe, it, expect, beforeAll } from "vitest"
import { db } from "@/lib/db"
import { emailOtpTokens, users } from "../../db/schema"
import { eq, isNull } from "drizzle-orm"
import { generateAndStoreOtp, verifyOtp } from "@/lib/otp"
import { ctx } from "./state"

// ── Test suite ────────────────────────────────────────────────────────────────

describe("OTP integration — full lifecycle against pruma_db", () => {
  let testUserId: string

  beforeAll(async () => {
    // Reuse the user created by setup.ts beforeAll
    testUserId = ctx.userId

    // Reset email_otp_tokens for this user before each suite
    await db.delete(emailOtpTokens).where(eq(emailOtpTokens.userId, testUserId))

    // Reset emailVerified for this user so we can assert it flips after verify
    await db.update(users).set({ emailVerified: null }).where(eq(users.id, testUserId))
  }, 15_000)

  // ── 1. generateAndStoreOtp inserts a row ─────────────────────────────────

  it("generateAndStoreOtp retorna código de 6 dígitos e insere row no DB", async () => {
    const code = await generateAndStoreOtp(testUserId)

    expect(code).toMatch(/^\d{6}$/)
    const num = parseInt(code, 10)
    expect(num).toBeGreaterThanOrEqual(100_000)
    expect(num).toBeLessThanOrEqual(999_999)

    const rows = await db
      .select()
      .from(emailOtpTokens)
      .where(eq(emailOtpTokens.userId, testUserId))

    expect(rows).toHaveLength(1)
    expect(rows[0].usedAt).toBeNull()
    expect(rows[0].expiresAt.getTime()).toBeGreaterThan(Date.now())
    // tokenHash must NOT equal the plaintext code
    expect(rows[0].tokenHash).not.toBe(code)
  })

  // ── 2. verifyOtp with correct code returns "ok" + flips emailVerified ────

  it("verifyOtp com código correto retorna 'ok' e seta emailVerified + usedAt", async () => {
    // Generate fresh OTP
    const code = await generateAndStoreOtp(testUserId)

    const result = await verifyOtp(testUserId, code)
    expect(result).toBe("ok")

    // users.emailVerified must be non-null now
    const [user] = await db
      .select({ emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.id, testUserId))
    expect(user.emailVerified).not.toBeNull()

    // email_otp_tokens.usedAt must be non-null now
    const [token] = await db
      .select({ usedAt: emailOtpTokens.usedAt })
      .from(emailOtpTokens)
      .where(eq(emailOtpTokens.userId, testUserId))
    expect(token.usedAt).not.toBeNull()
  })

  // ── 3. verifyOtp with same (now used) code returns "no-token" ────────────

  it("verifyOtp com o mesmo código já usado retorna 'no-token'", async () => {
    // The token from the previous test is now used — generate a fresh one so
    // we can test the already-used scenario: mark the new one as used manually
    // then call verifyOtp again to get "no-token"
    const code = await generateAndStoreOtp(testUserId)

    // Mark it as used directly so the next call sees no unused row
    await db
      .update(emailOtpTokens)
      .set({ usedAt: new Date() })
      .where(isNull(emailOtpTokens.usedAt))

    const result = await verifyOtp(testUserId, code)
    expect(result).toBe("no-token")
  })

  // ── 4. verifyOtp with wrong code returns "wrong" ─────────────────────────

  it("verifyOtp com código incorreto retorna 'wrong'", async () => {
    // Generate a fresh OTP — do NOT verify it
    await generateAndStoreOtp(testUserId)

    const result = await verifyOtp(testUserId, "000000")
    expect(result).toBe("wrong")
  })

  // ── 5. verifyOtp with expired token returns "expired" ────────────────────

  it("verifyOtp com token expirado retorna 'expired'", async () => {
    // Clean up any existing tokens for this user
    await db.delete(emailOtpTokens).where(eq(emailOtpTokens.userId, testUserId))

    // Manually insert an expired token row (expiresAt in the past)
    const pastDate = new Date(Date.now() - 1000) // 1 second in the past
    await db.insert(emailOtpTokens).values({
      userId: testUserId,
      tokenHash: "$2b$10$fakehashnotmatchinganything",
      expiresAt: pastDate,
    })

    const result = await verifyOtp(testUserId, "123456")
    expect(result).toBe("expired")
  })

  // ── 6. generateAndStoreOtp twice leaves only 1 row ───────────────────────

  it("dois generateAndStoreOtp consecutivos deixam exatamente 1 row no DB", async () => {
    await generateAndStoreOtp(testUserId)
    await generateAndStoreOtp(testUserId)

    const rows = await db
      .select()
      .from(emailOtpTokens)
      .where(eq(emailOtpTokens.userId, testUserId))

    expect(rows).toHaveLength(1)
  })
})
