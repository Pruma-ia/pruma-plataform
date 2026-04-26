import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { organizations, organizationMembers } from "../../../../../db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"

const schema = z.object({
  organizationName: z.string().min(2),
})

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  if (session.user.organizationId) {
    return NextResponse.json({ error: "Organização já existe" }, { status: 409 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { organizationName } = parsed.data
  const userId = session.user.id

  let slug = slugify(organizationName)
  const [slugConflict] = await db.select().from(organizations).where(eq(organizations.slug, slug))
  if (slugConflict) slug = `${slug}-${Date.now()}`

  const [org] = await db
    .insert(organizations)
    .values({ name: organizationName, slug })
    .returning()

  await db.insert(organizationMembers).values({
    organizationId: org.id,
    userId,
    role: "owner",
    acceptedAt: new Date(),
  })

  return NextResponse.json({ ok: true })
}
