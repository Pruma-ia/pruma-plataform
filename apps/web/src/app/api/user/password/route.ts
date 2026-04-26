import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { users } from "../../../../../db/schema"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"
import { z } from "zod"

const strongPassword = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .regex(/[A-Z]/, "Uma letra maiúscula")
  .regex(/[a-z]/, "Uma letra minúscula")
  .regex(/\d/, "Um número")
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Um caractere especial")

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: strongPassword,
})

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { currentPassword, newPassword } = parsed.data

  const [user] = await db
    .select({ password: users.password })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  if (!user?.password) {
    return NextResponse.json(
      { error: "Conta sem senha — use o método de login original (ex: Google)" },
      { status: 400 }
    )
  }

  const valid = await bcrypt.compare(currentPassword, user.password)
  if (!valid) {
    return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 })
  }

  const hashed = await bcrypt.hash(newPassword, 12)
  await db
    .update(users)
    .set({ password: hashed, updatedAt: new Date() })
    .where(eq(users.id, session.user.id))

  return NextResponse.json({ ok: true })
}
