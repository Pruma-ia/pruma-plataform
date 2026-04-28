import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { organizations, organizationMembers } from "../../../../../db/schema"
import { eq, and } from "drizzle-orm"
import { z } from "zod"

const patchSchema = z.object({
  cnpj: z.string().regex(/^\d{14}$/, "CNPJ deve ter 14 dígitos"),
  phone: z.string().min(10).max(15).nullable().optional(),
  addressStreet: z.string().min(1),
  addressNumber: z.string().min(1),
  addressComplement: z.string().nullable().optional(),
  addressZipCode: z.string().regex(/^\d{8}$/, "CEP deve ter 8 dígitos"),
  addressCity: z.string().min(1),
  addressState: z.string().length(2, "UF deve ter 2 caracteres"),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [org] = await db
    .select({
      name: organizations.name,
      cnpj: organizations.cnpj,
      phone: organizations.phone,
      addressStreet: organizations.addressStreet,
      addressNumber: organizations.addressNumber,
      addressComplement: organizations.addressComplement,
      addressZipCode: organizations.addressZipCode,
      addressCity: organizations.addressCity,
      addressState: organizations.addressState,
    })
    .from(organizations)
    .where(eq(organizations.id, session.user.organizationId))

  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(org)
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [membership] = await db
    .select({ role: organizationMembers.role })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, session.user.organizationId),
        eq(organizationMembers.userId, session.user.id)
      )
    )

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  await db
    .update(organizations)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(organizations.id, session.user.organizationId))

  return NextResponse.json({ ok: true })
}
