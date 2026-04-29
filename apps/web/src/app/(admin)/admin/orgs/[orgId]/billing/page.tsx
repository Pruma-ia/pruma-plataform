import { db } from "@/lib/db"
import { organizations } from "../../../../../../../db/schema"
import { eq } from "drizzle-orm"
import { Header } from "@/components/dashboard/header"
import { SetupChargeForm } from "./setup-charge-form"

const statusLabels: Record<string, { label: string; color: string }> = {
  active: { label: "Ativo", color: "text-emerald-700 bg-emerald-50 border border-emerald-200" },
  trial: { label: "Período de teste", color: "text-primary bg-secondary border border-secondary" },
  past_due: { label: "Pagamento em atraso", color: "text-amber-700 bg-amber-50 border border-amber-200" },
  canceled: { label: "Cancelado", color: "text-destructive bg-destructive/5 border border-destructive/20" },
  inactive: { label: "Inativo", color: "text-muted-foreground bg-muted border border-border" },
}

export default async function AdminOrgBilling({
  params,
}: {
  params: Promise<{ orgId: string }>
}) {
  const { orgId } = await params

  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId))
  const statusInfo = statusLabels[org?.subscriptionStatus ?? "inactive"]

  return (
    <div>
      <Header title="Plano & Cobrança" />
      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        {/* Status da assinatura */}
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
          {org?.asaasCustomerId && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Asaas Customer ID: <code className="font-mono">{org.asaasCustomerId}</code>
              </p>
            </div>
          )}
          {org?.asaasSubscriptionId && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">
                Asaas Subscription ID: <code className="font-mono">{org.asaasSubscriptionId}</code>
              </p>
            </div>
          )}
          {org?.subscriptionEndsAt && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">
                Vence em: {new Date(org.subscriptionEndsAt).toLocaleDateString("pt-BR")}
              </p>
            </div>
          )}
        </div>

        {/* Taxa de setup */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="font-semibold mb-4">Taxa de Setup</h2>

          {org?.setupChargeStatus === "paid" && (
            <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-4 py-3 border border-emerald-200">
              Setup pago.{" "}
              {org.setupChargeAsaasId && (
                <span className="font-mono text-xs">ID Asaas: {org.setupChargeAsaasId}</span>
              )}
            </p>
          )}

          {org?.setupChargeStatus === "pending" && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-3">
              <p className="text-sm text-amber-700">
                <span className="font-medium">Cobrança pendente:</span>{" "}
                {org.setupChargeAmount != null
                  ? org.setupChargeAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                  : "—"}{" "}
                em {org.setupChargeInstallments}x. Cliente ainda não pagou.
              </p>
              <div>
                <p className="text-xs font-medium text-amber-800 mb-2">Entregas comprometidas:</p>
                <ol className="space-y-1">
                  {[
                    { num: "01", label: "Diagnóstico — mapeamento de gargalos da operação" },
                    { num: "02", label: "Construção — automações sob medida" },
                    { num: "03", label: "Validação — ajustes até funcionar como esperado" },
                    { num: "04", label: "Operação Fluida — manutenção e evolução contínua" },
                  ].map((d) => (
                    <li key={d.num} className="flex items-start gap-2 text-xs text-amber-700">
                      <span className="font-bold shrink-0">{d.num}</span>
                      {d.label}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {(!org?.setupChargeStatus || org.setupChargeStatus !== "paid") && (
            <SetupChargeForm orgId={orgId} currentStatus={org?.setupChargeStatus ?? null} />
          )}
        </div>
      </div>
    </div>
  )
}
