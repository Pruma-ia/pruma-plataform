import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { organizationInvites, users } from "../../../../../db/schema"
import { eq, and } from "drizzle-orm"
import { z } from "zod"
import crypto, { createHash } from "crypto"

const schema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member", "viewer"]).default("member"),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!["owner", "admin"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { email, role } = parsed.data
  const rawToken = crypto.randomBytes(32).toString("hex")
  const tokenHash = createHash("sha256").update(rawToken).digest("hex")
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias

  await db.insert(organizationInvites).values({
    organizationId: session.user.organizationId,
    email,
    role,
    token: tokenHash,
    invitedBy: session.user.id,
    expiresAt,
  })

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${rawToken}`
  // TODO: enviar email com inviteUrl

  return NextResponse.json({ ok: true, inviteUrl })
}

// GET - lista convites pendentes
export async function GET() {
  const session = await auth()
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!["owner", "admin"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
  }

  const invites = await db
    .select({
      id: organizationInvites.id,
      email: organizationInvites.email,
      role: organizationInvites.role,
      invitedBy: organizationInvites.invitedBy,
      expiresAt: organizationInvites.expiresAt,
      createdAt: organizationInvites.createdAt,
    })
    .from(organizationInvites)
    .where(
      and(
        eq(organizationInvites.organizationId, session.user.organizationId),
        eq(organizationInvites.acceptedAt, null as unknown as Date)
      )
    )

  return NextResponse.json({ invites })
}
