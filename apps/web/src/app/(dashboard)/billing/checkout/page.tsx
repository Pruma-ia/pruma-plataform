import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { organizations } from "../../../../../db/schema"
import { eq } from "drizzle-orm"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Header } from "@/components/dashboard/header"
import { CheckoutForm } from "./checkout-form"

export default async function CheckoutPage() {
  const session = await auth()
  const orgId = session?.user?.organizationId
  if (!orgId) redirect("/dashboard")

  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId))
  if (!org) redirect("/billing")

  const profileIncomplete = !org.cnpj || !org.addressZipCode || !org.addressNumber

  const setupCharge =
    org.setupChargeStatus === "pending" &&
    org.setupChargeAmount != null &&
    org.setupChargeInstallments != null
      ? { amount: org.setupChargeAmount, installments: org.setupChargeInstallments }
      : null

  return (
    <div>
      <Header title="Contratar" />
      <div className="p-6 max-w-lg mx-auto">
        <Link
          href="/billing"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar ao plano
        </Link>

        <CheckoutForm setupCharge={setupCharge} profileIncomplete={profileIncomplete} />
      </div>
    </div>
  )
}
