import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { organizations } from "../../../../../db/schema"
import { eq } from "drizzle-orm"
import { asaas } from "@/lib/asaas"
import { z } from "zod"

const schema = z.object({
  creditCard: z.object({
    holderName: z.string(),
    number: z.string(),
    expiryMonth: z.string(),
    expiryYear: z.string(),
    ccv: z.string(),
  }),
})

const PLAN = { value: 990, label: "Pro" }

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { creditCard } = parsed.data
  const remoteIp = req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim()
    ?? req.headers.get("x-real-ip") ?? undefined

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, session.user.organizationId))

  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 })

  if (!org.cnpj || !org.addressZipCode || !org.addressNumber) {
    return NextResponse.json(
      { error: "Complete o cadastro da organização (CNPJ e endereço) antes de assinar." },
      { status: 400 }
    )
  }

  // Cria ou recupera customer no Asaas
  let customerId = org.asaasCustomerId
  if (!customerId) {
    const { data: existing } = await asaas.customers.find(session.user.email!)
    if (existing.length > 0) {
      customerId = existing[0].id
    } else {
      const customer = await asaas.customers.create({
        name: org.name,
        email: session.user.email!,
        cpfCnpj: org.cnpj,
      })
      customerId = customer.id
    }

    await db
      .update(organizations)
      .set({ asaasCustomerId: customerId })
      .where(eq(organizations.id, org.id))
  }

  const nextDueDate = new Date()
  nextDueDate.setDate(nextDueDate.getDate() + 1)
  const nextDueDateStr = nextDueDate.toISOString().split("T")[0]

  const subscription = await asaas.subscriptions.create({
    customer: customerId,
    billingType: "CREDIT_CARD",
    value: PLAN.value,
    nextDueDate: nextDueDateStr,
    cycle: "MONTHLY",
    description: `Plano ${PLAN.label} - Pruma.ia`,
    creditCard: {
      holderName: creditCard.holderName,
      number: creditCard.number,
      expiryMonth: creditCard.expiryMonth,
      expiryYear: creditCard.expiryYear,
      ccv: creditCard.ccv,
    },
    creditCardHolderInfo: {
      name: org.name,
      email: session.user.email!,
      cpfCnpj: org.cnpj,
      postalCode: org.addressZipCode,
      addressNumber: org.addressNumber,
      phone: org.phone ?? undefined,
    },
    remoteIp,
  })

  await db
    .update(organizations)
    .set({
      asaasSubscriptionId: subscription.id,
      asaasPlanId: "pro",
      subscriptionStatus: "active",
      subscriptionEndsAt: null,
    })
    .where(eq(organizations.id, org.id))

  return NextResponse.json({ ok: true, subscriptionId: subscription.id })
}
