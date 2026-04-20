import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { organizations } from "../../../../db/schema"
import { eq } from "drizzle-orm"
import { Header } from "@/components/dashboard/header"
import { BillingPlans } from "./billing-plans"

const statusLabels: Record<string, { label: string; color: string }> = {
  active: { label: "Ativo", color: "text-[#00AEEF] bg-[#E0F6FE]" },
  trial: { label: "Período de teste", color: "text-[#0D1B4B] bg-[#E0F6FE]" },
  past_due: { label: "Pagamento em atraso", color: "text-amber-600 bg-amber-50" },
  canceled: { label: "Cancelado", color: "text-red-600 bg-red-50" },
  inactive: { label: "Inativo", color: "text-muted-foreground bg-muted" },
}

export default async function BillingPage() {
  const session = await auth()
  const orgId = session!.user.organizationId!

  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId))
  const statusInfo = statusLabels[org?.subscriptionStatus ?? "inactive"]

  return (
    <div>
      <Header title="Plano & Cobrança" />
      <div className="p-6 space-y-6">
        {/* Status atual */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Status da assinatura</p>
              <span className={`mt-1 inline-block rounded-full px-3 py-1 text-sm font-medium ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
            {org?.asaasPlanId && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Plano atual</p>
                <p className="font-semibold capitalize">{org.asaasPlanId}</p>
              </div>
            )}
          </div>
        </div>

        {/* Planos */}
        <BillingPlans currentPlan={org?.asaasPlanId ?? null} />
      </div>
    </div>
  )
}
