import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { passwordResetTokens, users } from "../../../../../db/schema"
import { eq, and, gt, isNull } from "drizzle-orm"
import { createHash } from "crypto"
import bcrypt from "bcryptjs"
import { z } from "zod"

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
})

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  const { token, password } = parsed.data
  const tokenHash = createHash("sha256").update(token).digest("hex")

  const [record] = await db
    .select({ id: passwordResetTokens.id, userId: passwordResetTokens.userId })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        gt(passwordResetTokens.expiresAt, new Date()),
        isNull(passwordResetTokens.usedAt)
      )
    )
    .limit(1)

  if (!record) {
    return NextResponse.json({ error: "Link inválido ou expirado" }, { status: 400 })
  }

  const hashed = await bcrypt.hash(password, 12)

  await db
    .update(users)
    .set({ password: hashed, updatedAt: new Date() })
    .where(eq(users.id, record.userId))

  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, record.id))

  return NextResponse.json({ ok: true })
}
