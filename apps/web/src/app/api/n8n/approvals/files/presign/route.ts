import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { approvalFileUploads, organizations } from "../../../../../../../db/schema"
import { eq } from "drizzle-orm"
import { verifyN8nSecret } from "@/lib/n8n"
import { buildR2Key, presignUploadUrl, ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/r2"
import { z } from "zod"

const schema = z.object({
  organizationSlug: z.string(),
  filename: z.string().min(1).max(255),
  mimeType: z.string(),
  sizeBytes: z.number().int().positive().max(MAX_FILE_SIZE_BYTES),
})

export async function POST(req: Request) {
  if (!verifyN8nSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { organizationSlug, filename, mimeType, sizeBytes } = parsed.data

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return NextResponse.json(
      { error: `mimeType não permitido. Aceitos: ${[...ALLOWED_MIME_TYPES].join(", ")}` },
      { status: 422 }
    )
  }

  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.n8nSlug, organizationSlug))
    .limit(1)
    .then(async (rows) => {
      if (rows.length > 0) return rows
      return db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.slug, organizationSlug))
        .limit(1)
    })

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 })
  }

  const r2Key = buildR2Key(org.id, filename)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 min

  const uploadUrl = await presignUploadUrl(r2Key, mimeType, sizeBytes)

  await db.insert(approvalFileUploads).values({
    organizationId: org.id,
    r2Key,
    filename,
    mimeType,
    sizeBytes,
    status: "pending",
    expiresAt,
  })

  return NextResponse.json({ uploadUrl, r2Key, expiresAt: expiresAt.toISOString() })
}
