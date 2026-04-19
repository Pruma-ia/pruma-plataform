import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { organizations } from "../../../../../db/schema"
import { eq } from "drizzle-orm"
import { asaas } from "@/lib/asaas"

// DELETE - cancela assinatura
export async function DELETE() {
  const session = await auth()
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, session.user.organizationId))

  if (!org?.asaasSubscriptionId) {
    return NextResponse.json({ error: "No active subscription" }, { status: 404 })
  }

  await asaas.subscriptions.cancel(org.asaasSubscriptionId)

  await db
    .update(organizations)
    .set({ subscriptionStatus: "canceled", asaasSubscriptionId: null })
    .where(eq(organizations.id, org.id))

  return NextResponse.json({ ok: true })
}

// GET - retorna detalhes da assinatura
export async function GET() {
  const session = await auth()
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, session.user.organizationId))

  if (!org?.asaasSubscriptionId) {
    return NextResponse.json({ subscription: null })
  }

  const subscription = await asaas.subscriptions.get(org.asaasSubscriptionId)
  return NextResponse.json({ subscription })
}
