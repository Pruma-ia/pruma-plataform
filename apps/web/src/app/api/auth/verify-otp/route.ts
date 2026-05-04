import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { verifyOtp } from "@/lib/otp"
import { otpVerifyRatelimit } from "@/lib/ratelimit"

const bodySchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Código deve ter 6 dígitos"),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  const { success: rlOk } = await otpVerifyRatelimit.limit(userId)
  if (!rlOk) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_code" }, { status: 400 })
  }

  const result = await verifyOtp(userId, parsed.data.code)
  if (result === "ok") return NextResponse.json({ ok: true })
  if (result === "expired") return NextResponse.json({ error: "expired" }, { status: 410 })
  if (result === "no-token") return NextResponse.json({ error: "no_token" }, { status: 400 })
  return NextResponse.json({ error: "wrong" }, { status: 400 })
}
