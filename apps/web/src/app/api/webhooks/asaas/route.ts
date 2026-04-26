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

function mapAsaasStatus(event: string): "active" | "past_due" | "canceled" | "inactive" | null {
  switch (event) {
    case "PAYMENT_CONFIRMED":
    case "PAYMENT_RECEIVED":
      return "active"
    case "PAYMENT_OVERDUE":
      return "past_due"
    case "SUBSCRIPTION_DELETED":
    case "PAYMENT_DELETED":
      return "canceled"
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

  const newStatus = mapAsaasStatus(event)
  if (!newStatus) {
    return NextResponse.json({ ok: true })
  }

  await db
    .update(organizations)
    .set({
      subscriptionStatus: newStatus,
      updatedAt: new Date(),
    })
    .where(eq(organizations.asaasSubscriptionId, asaasSubscriptionId))

  return NextResponse.json({ ok: true })
}
