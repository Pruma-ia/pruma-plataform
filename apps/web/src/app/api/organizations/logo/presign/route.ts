import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import {
  buildOrgLogoR2Key,
  presignUploadUrl,
  LOGO_ALLOWED_MIME_TYPES,
  MAX_LOGO_SIZE_BYTES,
} from "@/lib/r2"

const PRIVILEGED_ROLES = new Set(["owner", "admin"])
const PRESIGN_TTL_MS = 10 * 60 * 1000

const schema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string(),
  sizeBytes: z.number().int().positive().max(MAX_LOGO_SIZE_BYTES),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const orgId = session.user.organizationId
  if (!orgId) {
    return NextResponse.json({ error: "no_organization" }, { status: 400 })
  }
  if (!PRIVILEGED_ROLES.has(session.user.role ?? "")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const { filename, mimeType, sizeBytes } = parsed.data

  if (!LOGO_ALLOWED_MIME_TYPES.has(mimeType)) {
    return NextResponse.json(
      { error: `mimeType não permitido. Aceitos: ${[...LOGO_ALLOWED_MIME_TYPES].join(", ")}` },
      { status: 422 },
    )
  }

  const r2Key = buildOrgLogoR2Key(orgId, filename)
  const expiresAt = new Date(Date.now() + PRESIGN_TTL_MS)
  const uploadUrl = await presignUploadUrl(r2Key, mimeType, sizeBytes)

  return NextResponse.json({ uploadUrl, r2Key, expiresAt: expiresAt.toISOString() })
}
