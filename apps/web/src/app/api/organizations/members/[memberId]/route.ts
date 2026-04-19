import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { organizationMembers } from "../../../../../../db/schema"
import { eq, and } from "drizzle-orm"
import { z } from "zod"

const patchSchema = z.object({
  role: z.enum(["admin", "member", "viewer"]),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const session = await auth()
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!["owner", "admin"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
  }

  const { memberId } = await params
  const body = await req.json()
  const { role } = patchSchema.parse(body)

  await db
    .update(organizationMembers)
    .set({ role })
    .where(
      and(
        eq(organizationMembers.id, memberId),
        eq(organizationMembers.organizationId, session.user.organizationId)
      )
    )

  return NextResponse.json({ ok: true })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const session = await auth()
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!["owner", "admin"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
  }

  const { memberId } = await params

  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.id, memberId),
        eq(organizationMembers.organizationId, session.user.organizationId)
      )
    )

  if (member?.role === "owner") {
    return NextResponse.json({ error: "Cannot remove owner" }, { status: 403 })
  }

  await db
    .delete(organizationMembers)
    .where(
      and(
        eq(organizationMembers.id, memberId),
        eq(organizationMembers.organizationId, session.user.organizationId)
      )
    )

  return NextResponse.json({ ok: true })
}
