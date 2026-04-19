import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { organizations } from "../../../../../db/schema"
import { eq } from "drizzle-orm"
import { asaas } from "@/lib/asaas"
import { z } from "zod"

const schema = z.object({
  planId: z.enum(["starter", "pro", "enterprise"]),
  billingType: z.enum(["CREDIT_CARD", "BOLETO", "PIX"]).default("CREDIT_CARD"),
  // Para crédito direto (não obrigatório se usar payment link)
  creditCard: z.object({
    holderName: z.string(),
    number: z.string(),
    expiryMonth: z.string(),
    expiryYear: z.string(),
    ccv: z.string(),
  }).optional(),
  holderInfo: z.object({
    name: z.string(),
    email: z.string().email(),
    cpfCnpj: z.string(),
    postalCode: z.string(),
    addressNumber: z.string(),
    phone: z.string().optional(),
  }).optional(),
  remoteIp: z.string().optional(),
})

const PLANS = {
  starter: { value: 97, label: "Starter" },
  pro: { value: 297, label: "Pro" },
  enterprise: { value: 997, label: "Enterprise" },
}

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

  const { planId, billingType, creditCard, holderInfo, remoteIp } = parsed.data
  const plan = PLANS[planId]

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, session.user.organizationId))

  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 })

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
        cpfCnpj: holderInfo?.cpfCnpj,
      })
      customerId = customer.id
    }

    await db
      .update(organizations)
      .set({ asaasCustomerId: customerId })
      .where(eq(organizations.id, org.id))
  }

  // Se não tiver dados de cartão, usa payment link
  if (!creditCard || !holderInfo) {
    const link = await asaas.paymentLinks.create({
      name: `Pruma.ia - ${plan.label}`,
      description: `Assinatura mensal do plano ${plan.label}`,
      value: plan.value,
      billingType,
      chargeType: "RECURRENT",
      subscriptionCycle: "MONTHLY",
      notificationEnabled: true,
    })
    return NextResponse.json({ url: link.url })
  }

  // Cria assinatura direta com cartão
  const nextDueDate = new Date()
  nextDueDate.setDate(nextDueDate.getDate() + 1)

  const subscription = await asaas.subscriptions.create({
    customer: customerId,
    billingType,
    value: plan.value,
    nextDueDate: nextDueDate.toISOString().split("T")[0],
    cycle: "MONTHLY",
    description: `Plano ${plan.label} - Pruma.ia`,
    creditCard: {
      holderName: creditCard.holderName,
      number: creditCard.number,
      expiryMonth: creditCard.expiryMonth,
      expiryYear: creditCard.expiryYear,
      ccv: creditCard.ccv,
    },
    creditCardHolderInfo: {
      name: holderInfo.name,
      email: holderInfo.email,
      cpfCnpj: holderInfo.cpfCnpj,
      postalCode: holderInfo.postalCode,
      addressNumber: holderInfo.addressNumber,
      phone: holderInfo.phone,
    },
    remoteIp,
  })

  await db
    .update(organizations)
    .set({
      asaasSubscriptionId: subscription.id,
      asaasPlanId: planId,
      subscriptionStatus: "active",
    })
    .where(eq(organizations.id, org.id))

  return NextResponse.json({ ok: true, subscriptionId: subscription.id })
}
