import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { organizations } from "../../../../db/schema"
import { eq } from "drizzle-orm"
import { AlertTriangle } from "lucide-react"
import { Header } from "@/components/dashboard/header"
import { BillingPlans } from "./billing-plans"
import { SetupChargeBanner } from "./setup-charge-banner"

const statusLabels: Record<string, { label: string; className: string }> = {
  active: { label: "Ativo", className: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  trial: { label: "Período de teste", className: "text-primary bg-secondary border-secondary" },
  past_due: { label: "Pagamento em atraso", className: "text-amber-700 bg-amber-50 border-amber-200" },
  canceled: { label: "Cancelado", className: "text-destructive bg-destructive/5 border-destructive/20" },
  inactive: { label: "Inativo", className: "text-muted-foreground bg-muted border-border" },
}

function trialDaysRemaining(endsAt: Date | null): number | null {
  if (!endsAt) return null
  const diff = endsAt.getTime() - Date.now()
  if (diff <= 0) return 0
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default async function BillingPage() {
  const session = await auth()
  const orgId = session!.user.organizationId!

  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId))
  const statusInfo = statusLabels[org?.subscriptionStatus ?? "inactive"]

  const profileIncomplete = !org?.cnpj || !org?.addressZipCode || !org?.addressNumber
  const hasSetupCharge =
    org?.setupChargeStatus === "pending" &&
    org?.setupChargeAmount != null &&
    org?.setupChargeInstallments != null

  const isTrial = org?.subscriptionStatus === "trial"
  const daysLeft = trialDaysRemaining(org?.subscriptionEndsAt ?? null)
  const trialEndsFormatted = org?.subscriptionEndsAt
    ? new Date(org.subscriptionEndsAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : null

  return (
    <div>
      <Header title="Plano & Cobrança" />
      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        {/* Banner dados incompletos */}
        {profileIncomplete && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-amber-800">Dados cadastrais incompletos</p>
              <p className="text-sm text-amber-700 mt-0.5">
                CNPJ e endereço são necessários para assinar.{" "}
                <a href="/settings/organization" className="underline font-medium hover:text-amber-900 transition-colors">
                  Completar dados
                </a>
              </p>
            </div>
          </div>
        )}

        {/* Banner taxa de setup pendente */}
        {hasSetupCharge && (
          <SetupChargeBanner
            amount={org.setupChargeAmount!}
            installments={org.setupChargeInstallments!}
            profileIncomplete={profileIncomplete}
          />
        )}

        {/* Status atual */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Status da assinatura</p>
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${statusInfo.className}`}>
                {statusInfo.label}
              </span>
              {isTrial && trialEndsFormatted && (
                <div className="space-y-0.5">
                  <p className="text-sm text-muted-foreground">
                    Período de teste encerra em{" "}
                    <span className="font-medium text-foreground">{trialEndsFormatted}</span>
                  </p>
                  {daysLeft !== null && daysLeft <= 7 && (
                    <p className="text-sm font-medium text-amber-600">
                      {daysLeft === 0
                        ? "Expira hoje — assine para continuar."
                        : `${daysLeft} dia${daysLeft > 1 ? "s" : ""} restante${daysLeft > 1 ? "s" : ""}.`}
                    </p>
                  )}
                </div>
              )}
            </div>
            {org?.asaasPlanId && (
              <div className="text-right shrink-0">
                <p className="text-sm text-muted-foreground">Plano atual</p>
                <p className="font-semibold capitalize text-primary">{org.asaasPlanId}</p>
              </div>
            )}
          </div>
        </div>

        {/* Plano */}
        <BillingPlans currentPlan={org?.asaasPlanId ?? null} profileIncomplete={profileIncomplete} />
      </div>
    </div>
  )
}
