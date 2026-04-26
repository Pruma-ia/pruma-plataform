import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users, passwordResetTokens } from "../../../../../db/schema"
import { eq, and, gt } from "drizzle-orm"
import { randomBytes, createHash } from "crypto"
import { z } from "zod"
import { sendPasswordResetEmail } from "@/lib/email"

const schema = z.object({
  email: z.string().email(),
})

// Rate limit: 3 requests per email per hour
const emailRateMap = new Map<string, { count: number; resetAt: number }>()

function isEmailRateLimited(email: string): boolean {
  const now = Date.now()
  const entry = emailRateMap.get(email)
  if (!entry || now > entry.resetAt) {
    emailRateMap.set(email, { count: 1, resetAt: now + 3_600_000 })
    return false
  }
  if (entry.count >= 3) return true
  entry.count++
  return false
}

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    // Always 200 — prevent user enumeration
    return NextResponse.json({ ok: true })
  }

  const { email } = parsed.data

  if (isEmailRateLimited(email)) {
    return NextResponse.json({ ok: true })
  }

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (!user) {
    return NextResponse.json({ ok: true })
  }

  // Invalidate previous pending tokens for this user
  await db
    .delete(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.userId, user.id),
        gt(passwordResetTokens.expiresAt, new Date())
      )
    )

  const rawToken = randomBytes(32).toString("hex")
  const tokenHash = createHash("sha256").update(rawToken).digest("hex")
  const expiresAt = new Date(Date.now() + 3_600_000) // 1h

  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt,
  })

  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${rawToken}`

  try {
    await sendPasswordResetEmail(email, resetUrl)
  } catch {
    // Silently fail — don't leak whether email exists
  }

  return NextResponse.json({ ok: true })
}
