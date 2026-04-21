import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { onboardingTokens, organizations } from "../../../../../db/schema"
import { eq } from "drizzle-orm"
import { createHash } from "crypto"

// GET /api/onboarding/[token]
// Endpoint público consumido pelo pruma-deploy-kit durante `make setup`.
// Valida o token, retorna as credenciais da org e marca o token como usado.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  if (!token?.startsWith("pruma_ot_")) {
    return NextResponse.json({ error: "Token inválido" }, { status: 400 })
  }

  const tokenHash = createHash("sha256").update(token).digest("hex")

  const [record] = await db
    .select()
    .from(onboardingTokens)
    .where(eq(onboardingTokens.tokenHash, tokenHash))
    .limit(1)

  if (!record) {
    return NextResponse.json({ error: "Token não encontrado" }, { status: 404 })
  }

  if (record.usedAt) {
    return NextResponse.json({ error: "Token já utilizado" }, { status: 410 })
  }

  if (new Date() > record.expiresAt) {
    return NextResponse.json({ error: "Token expirado" }, { status: 410 })
  }

  const [org] = await db
    .select({ n8nSlug: organizations.n8nSlug, slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.id, record.organizationId))
    .limit(1)

  if (!org) {
    return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 })
  }

  await db
    .update(onboardingTokens)
    .set({ usedAt: new Date() })
    .where(eq(onboardingTokens.id, record.id))

  return NextResponse.json({
    organizationSlug: org.n8nSlug ?? org.slug,
    n8nSecret: process.env.N8N_WEBHOOK_SECRET ?? "",
    apiUrl: process.env.NEXTAUTH_URL ?? "https://app.pruma.ia",
  })
}
