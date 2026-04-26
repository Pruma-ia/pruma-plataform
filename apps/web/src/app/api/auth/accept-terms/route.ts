import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { users } from "../../../../../db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"

const schema = z.object({
  marketingConsent: z.boolean().default(false),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  await db
    .update(users)
    .set({ acceptedTermsAt: new Date(), marketingConsent: parsed.data.marketingConsent })
    .where(eq(users.id, session.user.id))

  return NextResponse.json({ ok: true })
}
