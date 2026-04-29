import { NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { db } from "@/lib/db"
import { organizations } from "../../../../../db/schema"
import { eq } from "drizzle-orm"

function verifyWebhookToken(req: Request): boolean {
  const token = req.headers.get("asaas-access-token")
  const expected = process.env.ASAAS_WEBHOOK_TOKEN
  if (!token || !expected) return false
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected))
  } catch {
    return false
  }
}

type StatusUpdate = {
  subscriptionStatus: "active" | "past_due" | "canceled" | "inactive"
  subscriptionEndsAt?: Date | null
}

function mapAsaasEvent(event: string): StatusUpdate | null {
  switch (event) {
    case "PAYMENT_CONFIRMED":
    case "PAYMENT_RECEIVED":
      return { subscriptionStatus: "active", subscriptionEndsAt: null }
    case "PAYMENT_OVERDUE":
      return { subscriptionStatus: "past_due" }
    case "SUBSCRIPTION_DELETED":
    case "PAYMENT_DELETED":
      return { subscriptionStatus: "canceled", subscriptionEndsAt: new Date() }
    default:
      return null
  }
}

export async function POST(req: Request) {
  if (!verifyWebhookToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const payload = await req.json()
  const { event, payment, subscription } = payload

  const asaasSubscriptionId = subscription?.id ?? payment?.subscription

  if (!asaasSubscriptionId) {
    return NextResponse.json({ ok: true })
  }

  const update = mapAsaasEvent(event)
  if (!update) {
    return NextResponse.json({ ok: true })
  }

  await db
    .update(organizations)
    .set({ ...update, updatedAt: new Date() })
    .where(eq(organizations.asaasSubscriptionId, asaasSubscriptionId))

  return NextResponse.json({ ok: true })
}
