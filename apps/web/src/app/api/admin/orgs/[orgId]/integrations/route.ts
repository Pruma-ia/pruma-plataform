import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { organizations } from "../../../../../../../db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"

const patchSchema = z.object({
  n8nSlug: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/, "Apenas letras minúsculas, números e hífens"),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const session = await auth()
  if (!session?.user.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { orgId } = await params
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const [existing] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.n8nSlug, parsed.data.n8nSlug))
    .limit(1)

  if (existing && existing.id !== orgId) {
    return NextResponse.json({ error: "Este slug já está em uso por outra organização" }, { status: 409 })
  }

  await db
    .update(organizations)
    .set({ n8nSlug: parsed.data.n8nSlug, updatedAt: new Date() })
    .where(eq(organizations.id, orgId))

  return NextResponse.json({ ok: true })
}

export async function GET(req: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const session = await auth()
  if (!session?.user.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { orgId } = await params
  const [org] = await db
    .select({ n8nSlug: organizations.n8nSlug, name: organizations.name, slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)

  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(org)
}
