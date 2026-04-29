import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { organizations } from "../../../../../../db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"

const schema = z.object({
  orgId: z.string().min(1),
  amount: z.number().int().min(1),
  installments: z.number().int().min(1).max(12),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { orgId, amount, installments } = parsed.data

  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId))
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 })

  await db
    .update(organizations)
    .set({
      setupChargeAmount: amount,
      setupChargeInstallments: installments,
      setupChargeStatus: "pending",
      setupChargeAsaasId: null,
    })
    .where(eq(organizations.id, orgId))

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const orgId = searchParams.get("orgId")
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 })

  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId))
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 })
  if (org.setupChargeStatus === "paid") {
    return NextResponse.json({ error: "Setup charge already paid — cannot remove." }, { status: 409 })
  }

  await db
    .update(organizations)
    .set({
      setupChargeAmount: null,
      setupChargeInstallments: null,
      setupChargeStatus: null,
      setupChargeAsaasId: null,
    })
    .where(eq(organizations.id, orgId))

  return NextResponse.json({ ok: true })
}
