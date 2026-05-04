import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { generateAndStoreOtp, getLatestOtpCreatedAt } from "@/lib/otp"
import { otpResendRatelimit } from "@/lib/ratelimit"
import { sendOtpResendEmail } from "@/lib/email"
import { db } from "@/lib/db"
import { users } from "../../../../../db/schema"
import { eq } from "drizzle-orm"

const COOLDOWN_MS = 60_000 // D-04: 60s cooldown between resend requests

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  const { success: rlOk } = await otpResendRatelimit.limit(userId)
  if (!rlOk) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 })
  }

  const last = await getLatestOtpCreatedAt(userId)
  if (last) {
    const elapsed = Date.now() - last.getTime()
    if (elapsed < COOLDOWN_MS) {
      const retryAfterSeconds = Math.ceil((COOLDOWN_MS - elapsed) / 1000)
      return NextResponse.json({ error: "cooldown", retryAfterSeconds }, { status: 429 })
    }
  }

  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user?.email) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 })
  }

  const code = await generateAndStoreOtp(userId)
  await sendOtpResendEmail(user.email, code)

  return NextResponse.json({ ok: true })
}
