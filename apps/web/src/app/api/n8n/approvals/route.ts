import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { approvals, flows, organizations } from "../../../../../db/schema"
import { eq, and } from "drizzle-orm"
import { verifyN8nSecret } from "@/lib/n8n"
import { z } from "zod"

const approvalRequestSchema = z.object({
  organizationSlug: z.string(),
  flowExternalId: z.string().optional(),
  n8nExecutionId: z.string(),
  callbackUrl: z.string().url(),
  title: z.string(),
  description: z.string().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  assignedToEmail: z.string().email().optional(),
  expiresAt: z.string().datetime().optional(),
})

// POST /api/n8n/approvals
// Chamado pelo n8n para criar uma solicitação de aprovação
export async function POST(req: Request) {
  if (!verifyN8nSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = approvalRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const {
    organizationSlug,
    flowExternalId,
    n8nExecutionId,
    callbackUrl,
    title,
    description,
    context,
    expiresAt,
  } = parsed.data

  const [org] = await db.select().from(organizations).where(eq(organizations.slug, organizationSlug))
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 })
  }

  let flowId: string | undefined
  if (flowExternalId) {
    const [flow] = await db
      .select()
      .from(flows)
      .where(and(eq(flows.organizationId, org.id), eq(flows.externalId, flowExternalId)))
    flowId = flow?.id
  }

  const [approval] = await db
    .insert(approvals)
    .values({
      organizationId: org.id,
      flowId,
      n8nExecutionId,
      callbackUrl,
      title,
      description,
      context,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    })
    .returning()

  return NextResponse.json({ ok: true, approvalId: approval.id })
}
