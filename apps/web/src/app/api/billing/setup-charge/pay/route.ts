import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { organizations } from "../../../../../../db/schema"
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

  if (!org.setupChargeAmount || !org.setupChargeInstallments || org.setupChargeStatus !== "pending") {
    return NextResponse.json({ error: "Nenhuma cobrança de setup pendente." }, { status: 400 })
  }

  if (!org.cnpj || !org.addressZipCode || !org.addressNumber) {
    return NextResponse.json(
      { error: "Complete o cadastro da organização (CNPJ e endereço) antes de pagar." },
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

  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 1)
  const dueDateStr = dueDate.toISOString().split("T")[0]

  const installments = org.setupChargeInstallments
  const totalAmount = org.setupChargeAmount
  const installmentValue = Math.ceil((totalAmount / installments) * 100) / 100

  const payment = await asaas.payments.create({
    customer: customerId,
    billingType: "CREDIT_CARD",
    value: totalAmount,
    dueDate: dueDateStr,
    description: "Taxa de setup - Pruma.ia",
    installmentCount: installments > 1 ? installments : undefined,
    installmentValue: installments > 1 ? installmentValue : undefined,
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
      setupChargeAsaasId: payment.id,
      setupChargeStatus: "paid",
    })
    .where(eq(organizations.id, org.id))

  return NextResponse.json({ ok: true, paymentId: payment.id })
}
