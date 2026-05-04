import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { users } from "../../../../../db/schema"

// Test-only endpoint — bypasses OTP flow to mark a user as email-verified.
// Used by Playwright E2E specs that need to access protected routes without
// completing the full OTP verification flow.
// Blocked in production so it cannot be abused.
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not_available" }, { status: 404 })
  }

  const { email } = (await req.json()) as { email: string }
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 })
  }

  await db.update(users).set({ emailVerified: new Date() }).where(eq(users.email, email))

  return NextResponse.json({ ok: true })
}
