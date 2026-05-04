import { NextResponse } from "next/server"
import { z } from "zod"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { users } from "../../../../../db/schema"

const schema = z.object({
  name: z
    .string()
    .min(1)
    .max(120)
    .transform((s) => s.trim())
    .refine((s) => s.length >= 1, { message: "Nome não pode estar em branco." }),
})

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  await db
    .update(users)
    .set({ name: parsed.data.name })
    .where(eq(users.id, session.user.id))

  return NextResponse.json({ ok: true })
}
