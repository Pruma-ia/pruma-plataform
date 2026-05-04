import crypto from "node:crypto"
import bcrypt from "bcryptjs"
import { and, desc, eq, isNull } from "drizzle-orm"
import { db } from "./db"
import { emailOtpTokens, users } from "../../db/schema"

const OTP_TTL_MS = 15 * 60 * 1000 // D-03: 15 minutes
const BCRYPT_ROUNDS = 10

export async function generateAndStoreOtp(userId: string): Promise<string> {
  const code = crypto.randomInt(100_000, 1_000_000).toString() // 6 digits, [100000..999999]
  const tokenHash = await bcrypt.hash(code, BCRYPT_ROUNDS)
  const expiresAt = new Date(Date.now() + OTP_TTL_MS)

  // Delete-then-insert wrapped in a transaction: one active row per user, race-safe (D-03).
  // Without the transaction, two concurrent resend requests could both DELETE before either
  // INSERTs, leaving two live rows or a constraint violation on a future UNIQUE index.
  await db.transaction(async (tx) => {
    await tx.delete(emailOtpTokens).where(eq(emailOtpTokens.userId, userId))
    await tx.insert(emailOtpTokens).values({ userId, tokenHash, expiresAt })
  })

  return code
}

export type VerifyResult = "ok" | "wrong" | "expired" | "no-token"

export async function verifyOtp(userId: string, code: string): Promise<VerifyResult> {
  const [token] = await db
    .select()
    .from(emailOtpTokens)
    .where(and(eq(emailOtpTokens.userId, userId), isNull(emailOtpTokens.usedAt)))
    .orderBy(desc(emailOtpTokens.createdAt))
    .limit(1)

  if (!token) return "no-token"
  if (token.expiresAt.getTime() < Date.now()) return "expired"

  const valid = await bcrypt.compare(code, token.tokenHash)
  if (!valid) return "wrong"

  await db.transaction(async (tx) => {
    await tx
      .update(emailOtpTokens)
      .set({ usedAt: new Date() })
      .where(eq(emailOtpTokens.id, token.id))
    await tx
      .update(users)
      .set({ emailVerified: new Date() })
      .where(eq(users.id, userId))
  })

  return "ok"
}

export async function getLatestOtpCreatedAt(userId: string): Promise<Date | null> {
  const [row] = await db
    .select({ createdAt: emailOtpTokens.createdAt })
    .from(emailOtpTokens)
    .where(eq(emailOtpTokens.userId, userId))
    .orderBy(desc(emailOtpTokens.createdAt))
    .limit(1)
  return row?.createdAt ?? null
}
