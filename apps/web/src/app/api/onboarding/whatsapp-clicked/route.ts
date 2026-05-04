import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { organizations } from "../../../../../db/schema"

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const orgId = session.user.organizationId
  if (!orgId) {
    return NextResponse.json({ error: "no_organization" }, { status: 400 })
  }

  // orgId always from session — never from request body (multi-tenant safety, T-03-02)
  await db
    .update(organizations)
    .set({ onboardingWhatsappClickedAt: new Date() })
    .where(eq(organizations.id, orgId))

  return NextResponse.json({ ok: true })
}
