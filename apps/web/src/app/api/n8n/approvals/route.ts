import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { approvals, flows, organizations } from "../../../../../db/schema"
import { eq, and } from "drizzle-orm"
import { verifyN8nSecret, validateCallbackUrl } from "@/lib/n8n"
import { z } from "zod"

const approvalRequestSchema = z.object({
  organizationSlug: z.string(),
  prumaFlowId: z.string().optional(),
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

  const { organizationSlug, prumaFlowId, n8nExecutionId, callbackUrl, title, description, context, expiresAt } =
    parsed.data

  // Busca org pelo n8nSlug com fallback para slug de URL
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.n8nSlug, organizationSlug))
    .limit(1)
    .then(async (rows) => {
      if (rows.length > 0) return rows
      return db.select().from(organizations).where(eq(organizations.slug, organizationSlug)).limit(1)
    })

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 })
  }

  // Bloqueia SSRF independente do n8nBaseUrl
  if (!validateCallbackUrl(callbackUrl)) {
    return NextResponse.json({ error: "callbackUrl inválida ou aponta para rede privada" }, { status: 422 })
  }

  // Se org tem n8nBaseUrl registrada, exige que callbackUrl seja do mesmo domínio
  if (org.n8nBaseUrl) {
    const allowedHost = new URL(org.n8nBaseUrl).hostname
    const callbackHost = new URL(callbackUrl).hostname
    if (callbackHost !== allowedHost) {
      return NextResponse.json(
        { error: `callbackUrl deve pertencer ao domínio n8n registrado (${allowedHost})` },
        { status: 422 }
      )
    }
  }

  let flowId: string | undefined
  if (prumaFlowId) {
    const [flow] = await db
      .select()
      .from(flows)
      .where(and(eq(flows.organizationId, org.id), eq(flows.prumaFlowId, prumaFlowId)))
      .limit(1)
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
