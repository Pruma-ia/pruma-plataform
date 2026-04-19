import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { flows, flowRuns, organizations } from "../../../../../db/schema"
import { eq, and } from "drizzle-orm"
import { verifyN8nSecret } from "@/lib/n8n"
import { z } from "zod"

const flowUpdateSchema = z.object({
  organizationSlug: z.string(),
  externalId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  status: z.enum(["running", "success", "error", "waiting"]),
  metadata: z.record(z.unknown()).optional(),
  errorMessage: z.string().optional(),
  startedAt: z.string().datetime().optional(),
  finishedAt: z.string().datetime().optional(),
})

// POST /api/n8n/flows
// Chamado pelo n8n para criar/atualizar o status de um fluxo
export async function POST(req: Request) {
  if (!verifyN8nSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = flowUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { organizationSlug, externalId, name, description, status, metadata, errorMessage, startedAt, finishedAt } =
    parsed.data

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, organizationSlug))

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 })
  }

  // Upsert do fluxo
  const existing = await db
    .select()
    .from(flows)
    .where(and(eq(flows.organizationId, org.id), eq(flows.externalId, externalId)))

  let flowId: string

  if (existing.length > 0) {
    await db
      .update(flows)
      .set({ name, description, status, metadata, lastRunAt: new Date(), updatedAt: new Date() })
      .where(eq(flows.id, existing[0].id))
    flowId = existing[0].id
  } else {
    const [inserted] = await db
      .insert(flows)
      .values({ organizationId: org.id, externalId, name, description, status, metadata, lastRunAt: new Date() })
      .returning()
    flowId = inserted.id
  }

  // Registra run
  await db.insert(flowRuns).values({
    flowId,
    organizationId: org.id,
    status,
    payload: metadata,
    errorMessage,
    startedAt: startedAt ? new Date(startedAt) : undefined,
    finishedAt: finishedAt ? new Date(finishedAt) : undefined,
  })

  return NextResponse.json({ ok: true, flowId })
}
