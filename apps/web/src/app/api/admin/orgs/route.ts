import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { organizations, onboardingTokens } from "../../../../../db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { createHash, randomBytes } from "crypto"
import { validateCallbackUrl } from "@/lib/n8n"

const createOrgSchema = z.object({
  name: z.string().min(2).max(100),
  n8nSlug: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/, "Apenas letras minúsculas, números e hífens").optional(),
  n8nBaseUrl: z.string().url().optional(),
})

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

// POST /api/admin/orgs
// Cria org + n8nSlug + token de onboarding em uma única chamada.
// Retorna onboardingToken (raw, uso único) para o superadmin repassar ao cliente.
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createOrgSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { name, n8nBaseUrl } = parsed.data

  if (n8nBaseUrl && !validateCallbackUrl(n8nBaseUrl)) {
    return NextResponse.json({ error: "n8nBaseUrl inválida ou aponta para rede privada" }, { status: 422 })
  }

  const baseSlug = slugify(name)

  // Garante unicidade do slug incrementando sufixo se necessário
  let slug = baseSlug
  let suffix = 1
  while (true) {
    const [exists] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1)
    if (!exists) break
    slug = `${baseSlug}-${suffix++}`
  }

  const n8nSlug = parsed.data.n8nSlug ?? slug

  const [existingN8nSlug] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.n8nSlug, n8nSlug))
    .limit(1)

  if (existingN8nSlug) {
    return NextResponse.json({ error: "n8nSlug já está em uso por outra organização" }, { status: 409 })
  }

  const [org] = await db
    .insert(organizations)
    .values({ name, slug, n8nSlug, n8nBaseUrl })
    .returning()

  // Token raw nunca é salvo — apenas o hash SHA-256
  const rawToken = "pruma_ot_" + randomBytes(24).toString("hex")
  const tokenHash = createHash("sha256").update(rawToken).digest("hex")

  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 48)

  await db.insert(onboardingTokens).values({
    tokenHash,
    organizationId: org.id,
    expiresAt,
  })

  return NextResponse.json(
    { orgId: org.id, slug, n8nSlug, onboardingToken: rawToken },
    { status: 201 }
  )
}
