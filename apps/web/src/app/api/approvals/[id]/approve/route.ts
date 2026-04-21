import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { approvals } from "../../../../../../db/schema"
import { eq, and } from "drizzle-orm"
import { z } from "zod"
import { validateCallbackUrl } from "@/lib/n8n"

const schema = z.object({ comment: z.string().optional() })

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
      status: "approved",
      resolvedBy: session.user.id,
      resolvedAt: new Date(),
      comment,
      updatedAt: new Date(),
    })
    .where(eq(approvals.id, id))

  if (approval.callbackUrl) {
    if (!validateCallbackUrl(approval.callbackUrl)) {
      console.error("[approval:approve] callbackUrl bloqueado por SSRF", {
        approvalId: approval.id,
        callbackUrl: approval.callbackUrl,
      })
      await db
        .update(approvals)
        .set({ callbackStatus: "blocked", updatedAt: new Date() })
        .where(eq(approvals.id, id))
    } else {
      const callbackOk = await fetch(approval.callbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId: approval.id,
          status: "approved",
          resolvedBy: session.user.email,
          comment,
          resolvedAt: new Date().toISOString(),
        }),
      })
        .then((r) => r.ok)
        .catch((err) => {
          console.error("[approval:approve] falha no callback n8n", {
            approvalId: approval.id,
            error: String(err),
          })
          return false
        })

      await db
        .update(approvals)
        .set({ callbackStatus: callbackOk ? "sent" : "failed", updatedAt: new Date() })
        .where(eq(approvals.id, id))
    }
  }

  return NextResponse.json({ ok: true })
}
