import { db } from "@/lib/db"
import { flows, approvals, flowRuns, organizations } from "../../../../../../db/schema"
import { eq, desc, count, and } from "drizzle-orm"
import { Header } from "@/components/dashboard/header"
import { getOrgHeaderData } from "@/lib/org-header-data"
import { GitBranch, CheckSquare, Activity, AlertCircle } from "lucide-react"

const statusColors: Record<string, string> = {
  success: "bg-[#00AEEF]",
  error: "bg-red-500",
  running: "bg-[#5CCFF5] animate-pulse",
  waiting: "bg-[#0D1B4B]",
}

export default async function AdminOrgDashboard({
  params,
}: {
  params: Promise<{ orgId: string }>
}) {
  const { orgId } = await params

  const [flowStats, pendingApprovals, recentRuns, orgHeader] = await Promise.all([
    db.select({ total: count() }).from(flows).where(eq(flows.organizationId, orgId)),
    db
      .select({ total: count() })
      .from(approvals)
      .where(and(eq(approvals.organizationId, orgId), eq(approvals.status, "pending"))),
    db
      .select()
      .from(flowRuns)
      .where(eq(flowRuns.organizationId, orgId))
      .orderBy(desc(flowRuns.createdAt))
      .limit(5),
    getOrgHeaderData(orgId),
  ])

  const stats = [
    {
      label: "Fluxos ativos",
      value: flowStats[0]?.total ?? 0,
      icon: GitBranch,
      color: "text-[#00AEEF]",
      bg: "bg-[#E0F6FE]",
    },
    {
      label: "Aprovações pendentes",
      value: pendingApprovals[0]?.total ?? 0,
      icon: CheckSquare,
      color: "text-[#0D1B4B]",
      bg: "bg-[#E0F6FE]",
    },
  ]

  return (
    <div>
      <Header title="Dashboard" orgName={orgHeader.name} orgLogoUrl={orgHeader.logoUrl} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm"
            >
              <div className={`rounded-lg p-2 ${s.bg}`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b px-6 py-4">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold">Execuções recentes</h2>
          </div>
          <div className="divide-y">
            {recentRuns.length === 0 && (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                Nenhuma execução registrada.
              </p>
            )}
            {recentRuns.map((run) => (
              <div key={run.id} className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-3">
                  <span className={`h-2 w-2 rounded-full ${statusColors[run.status] ?? "bg-gray-400"}`} />
                  <span className="text-sm font-medium">{run.flowId}</span>
                </div>
                <div className="flex items-center gap-4">
                  {run.errorMessage && (
                    <span className="flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      {run.errorMessage.slice(0, 40)}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {run.createdAt.toLocaleString("pt-BR")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
