import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { approvals, approvalFiles, approvalFileUploads, flows, organizations, users } from "../../../../../db/schema"
import { eq, and, inArray } from "drizzle-orm"
import { verifyN8nSecret, validateCallbackUrl } from "@/lib/n8n"
import { z } from "zod"

const decisionOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
})

const decisionFieldSchema = z.object({
  id: z.string(),
  type: z.literal("select"),
  label: z.string(),
  options: z.array(decisionOptionSchema).min(1),
})

const fileRefSchema = z.object({
  r2Key: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().positive(),
})

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
  decisionFields: z.array(decisionFieldSchema).optional(),
  files: z.array(fileRefSchema).optional(),
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
    organizationSlug, prumaFlowId, n8nExecutionId, callbackUrl,
    title, description, context, expiresAt, decisionFields, files,
  } = parsed.data

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

  // Valida r2Keys: devem pertencer à mesma org e estar com status "pending"
  if (files && files.length > 0) {
    const r2Keys = files.map((f) => f.r2Key)
    const uploads = await db
      .select({ r2Key: approvalFileUploads.r2Key })
      .from(approvalFileUploads)
      .where(
        and(
          eq(approvalFileUploads.organizationId, org.id),
          eq(approvalFileUploads.status, "pending"),
          inArray(approvalFileUploads.r2Key, r2Keys)
        )
      )
    const validKeys = new Set(uploads.map((u) => u.r2Key))
    const invalid = r2Keys.filter((k) => !validKeys.has(k))
    if (invalid.length > 0) {
      return NextResponse.json({ error: "r2Keys inválidas ou expiradas", invalid }, { status: 422 })
    }
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
      decisionFields: decisionFields ?? null,
    })
    .returning()

  if (files && files.length > 0) {
    await db.insert(approvalFiles).values(
      files.map((f) => ({
        approvalId: approval.id,
        organizationId: org.id,
        r2Key: f.r2Key,
        filename: f.filename,
        mimeType: f.mimeType,
        sizeBytes: f.sizeBytes,
      }))
    )
    // Marca uploads como confirmados
    await db
      .update(approvalFileUploads)
      .set({ status: "confirmed" })
      .where(inArray(approvalFileUploads.r2Key, files.map((f) => f.r2Key)))
  }

  return NextResponse.json({ ok: true, approvalId: approval.id })
}
