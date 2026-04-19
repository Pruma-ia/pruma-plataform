import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { approvals } from "../../../../../../db/schema"
import { eq, and } from "drizzle-orm"
import { z } from "zod"

const schema = z.object({ comment: z.string().min(1, "Informe o motivo da rejeição") })

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const { comment } = schema.parse(body)

  const [approval] = await db
    .select()
    .from(approvals)
    .where(and(eq(approvals.id, id), eq(approvals.organizationId, session.user.organizationId)))

  if (!approval) {
    return NextResponse.json({ error: "Approval not found" }, { status: 404 })
  }
  if (approval.status !== "pending") {
    return NextResponse.json({ error: "Already resolved" }, { status: 409 })
  }

  await db
    .update(approvals)
    .set({
      status: "rejected",
      resolvedBy: session.user.id,
      resolvedAt: new Date(),
      comment,
      updatedAt: new Date(),
    })
    .where(eq(approvals.id, id))

  if (approval.callbackUrl) {
    await fetch(approval.callbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        approvalId: approval.id,
        status: "rejected",
        resolvedBy: session.user.email,
        comment,
        resolvedAt: new Date().toISOString(),
      }),
    }).catch(() => null)
  }

  return NextResponse.json({ ok: true })
}
