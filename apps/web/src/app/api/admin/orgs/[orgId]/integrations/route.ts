import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { organizations } from "../../../../../../../db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { validateCallbackUrl } from "@/lib/n8n"

const patchSchema = z.object({
  n8nSlug: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/, "Apenas letras minúsculas, números e hífens").optional(),
  n8nBaseUrl: z.string().url().optional(),
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

  if (!parsed.data.n8nSlug && !parsed.data.n8nBaseUrl) {
    return NextResponse.json({ error: "Informe n8nSlug ou n8nBaseUrl" }, { status: 400 })
  }

  if (parsed.data.n8nBaseUrl && !validateCallbackUrl(parsed.data.n8nBaseUrl)) {
    return NextResponse.json({ error: "n8nBaseUrl inválida ou aponta para rede privada" }, { status: 422 })
  }

  const [orgExists] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)

  if (!orgExists) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 })
  }

  if (parsed.data.n8nSlug) {
    const [existing] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.n8nSlug, parsed.data.n8nSlug))
      .limit(1)

    if (existing && existing.id !== orgId) {
      return NextResponse.json({ error: "Este slug já está em uso por outra organização" }, { status: 409 })
    }
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (parsed.data.n8nSlug) updates.n8nSlug = parsed.data.n8nSlug
  if (parsed.data.n8nBaseUrl) updates.n8nBaseUrl = parsed.data.n8nBaseUrl

  await db
    .update(organizations)
    .set(updates)
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
    .select({ n8nSlug: organizations.n8nSlug, n8nBaseUrl: organizations.n8nBaseUrl, name: organizations.name, slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)

  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(org)
}
