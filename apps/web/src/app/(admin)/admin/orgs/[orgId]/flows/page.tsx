import { db } from "@/lib/db"
import { flows } from "../../../../../../../db/schema"
import { eq, desc } from "drizzle-orm"
import { Header } from "@/components/dashboard/header"
import { GitBranch } from "lucide-react"

const statusLabel: Record<string, string> = {
  running: "Executando",
  success: "Concluído",
  error: "Erro",
  waiting: "Aguardando",
}

const statusColors: Record<string, string> = {
  running: "bg-[#E0F6FE] text-[#00AEEF]",
  success: "bg-[#E0F6FE] text-[#0D1B4B]",
  error: "bg-red-100 text-red-700",
  waiting: "bg-[#E0F6FE] text-[#162460]",
}

export default async function AdminOrgFlows({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params

  const allFlows = await db
    .select()
    .from(flows)
    .where(eq(flows.organizationId, orgId))
    .orderBy(desc(flows.updatedAt))

  return (
    <div>
      <Header title="Fluxos" />
      <div className="p-6">
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b px-6 py-4">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold">Todos os fluxos</h2>
            <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {allFlows.length}
            </span>
          </div>
          <div className="divide-y">
            {allFlows.length === 0 && (
              <p className="px-6 py-12 text-center text-sm text-muted-foreground">
                Nenhum fluxo encontrado.
              </p>
            )}
            {allFlows.map((flow) => (
              <div key={flow.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium">{flow.name}</p>
                  {flow.description && (
                    <p className="text-sm text-muted-foreground">{flow.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">ID externo: {flow.externalId}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[flow.status]}`}>
                    {statusLabel[flow.status]}
                  </span>
                  {flow.lastRunAt && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(flow.lastRunAt).toLocaleString("pt-BR")}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
