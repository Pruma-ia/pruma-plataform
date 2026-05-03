import { NextResponse } from "next/server"
import { z } from "zod"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { organizations } from "../../../../../db/schema"

const PRIVILEGED_ROLES = new Set(["owner", "admin"])

const schema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    logo: z.union([z.string().min(1).max(512), z.null()]).optional(),
  })
  .refine((d) => d.name !== undefined || d.logo !== undefined, {
    message: "Pelo menos um campo (name ou logo) deve ser fornecido.",
  })

export async function PATCH(req: Request) {
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

  const { name, logo } = parsed.data

  // Tenant guard: logo path must be in this org's namespace (T-04-01).
  if (typeof logo === "string") {
    const expectedPrefix = `org-logos/${orgId}/`
    if (!logo.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: "invalid_logo_path" }, { status: 400 })
    }
  }

  const patch: Record<string, unknown> = {}
  if (name !== undefined) patch.name = name
  if (logo !== undefined) patch.logo = logo // can be null to clear

  await db.update(organizations).set(patch).where(eq(organizations.id, orgId))

  return NextResponse.json({ ok: true })
}
