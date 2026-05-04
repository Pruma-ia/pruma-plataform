import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { approvals, approvalEvents, approvalFiles } from "../../../../../../db/schema"
import { eq, and } from "drizzle-orm"
import { z } from "zod"
import { dispatchCallback } from "@/lib/n8n"

const schema = z.object({
  comment: z.string().min(1, "Informe o motivo da rejeição"),
  decisionValues: z.record(z.string(), z.string()).optional(),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 422 })
  }
  const { comment, decisionValues } = parsed.data

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

  if (Array.isArray(approval.decisionFields)) {
    const fields = approval.decisionFields as { id: string; required?: boolean }[]
    const missing = fields.filter((f) => f.required && !decisionValues?.[f.id])
    if (missing.length > 0) {
      return NextResponse.json(
        { error: "Campos obrigatórios não preenchidos", fields: missing.map((f) => f.id) },
        { status: 422 }
      )
    }
  }

  await db
    .update(approvals)
    .set({
      status: "rejected",
      resolvedBy: session.user.id,
      resolvedAt: new Date(),
      comment,
      decisionValues: decisionValues ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(approvals.id, id), eq(approvals.organizationId, session.user.organizationId)))

  await db.insert(approvalEvents).values({
    id: crypto.randomUUID(),
    approvalId: id,
    eventType: "approval_resolved",
    actorType: "user",
    actorId: session.user.id,
    metadata: {
      status: "rejected",
      comment: comment ?? null,
      decisionValues: decisionValues ?? null,
    },
  })

  if (approval.callbackUrl) {
    const files = await db
      .select()
      .from(approvalFiles)
      .where(eq(approvalFiles.approvalId, id))

    const callbackStatus = await dispatchCallback(approval.callbackUrl, {
      approvalId: approval.id,
      status: "rejected",
      resolvedBy: session.user.email ?? null,
      comment,
      decisionValues: decisionValues ?? null,
      resolvedAt: new Date().toISOString(),
      files: files.map(f => ({ r2Key: f.r2Key, filename: f.filename, mimeType: f.mimeType, sizeBytes: f.sizeBytes })),
    })

    await db
      .update(approvals)
      .set({ callbackStatus, updatedAt: new Date() })
      .where(and(eq(approvals.id, id), eq(approvals.organizationId, session.user.organizationId)))
  }

  return NextResponse.json({ ok: true })
}
