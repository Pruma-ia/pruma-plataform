import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users, organizations, organizationMembers } from "../../../../../db/schema"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"
import { z } from "zod"

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "Pelo menos uma letra minúscula")
    .regex(/\d/, "Pelo menos um número")
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Pelo menos um caractere especial (!@#$...)"),
  organizationName: z.string().min(2),
  acceptedTerms: z.literal(true, { error: "Aceite dos termos é obrigatório" }),
  marketingConsent: z.boolean().default(false),
})

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const flat = parsed.error.flatten()
    const firstError =
      Object.values(flat.fieldErrors).flat()[0] ??
      /* v8 ignore next */
      (flat.formErrors[0] ?? "Dados inválidos")
    return NextResponse.json({ error: firstError }, { status: 400 })
  }

  const { name, email, password, organizationName, marketingConsent } = parsed.data

  const [existing] = await db.select().from(users).where(eq(users.email, email))
  if (existing) {
    return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 })
  }

  const hashed = await bcrypt.hash(password, 12)
  const [user] = await db
    .insert(users)
    .values({ name, email, password: hashed, acceptedTermsAt: new Date(), marketingConsent })
    .returning()

  // Cria a organização com slug único
  let slug = slugify(organizationName)
  const [slugConflict] = await db.select().from(organizations).where(eq(organizations.slug, slug))
  if (slugConflict) slug = `${slug}-${Date.now()}`

  const [org] = await db
    .insert(organizations)
    .values({ name: organizationName, slug })
    .returning()

  await db.insert(organizationMembers).values({
    organizationId: org.id,
    userId: user.id,
    role: "owner",
    acceptedAt: new Date(),
  })

  return NextResponse.json({ ok: true })
}
