import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { flows, approvals, flowRuns } from "../../../../db/schema"
import { eq, desc, count, and } from "drizzle-orm"
import { Header } from "@/components/dashboard/header"
import Link from "next/link"
import { GitBranch, CheckSquare, AlertCircle, Activity, CheckCircle2, Clock } from "lucide-react"
import {
  getResolvedTodayCount,
  getAvgResolutionMs,
  formatAvgTime,
  getOnboardingChecklistState,
} from "@/lib/dashboard-metrics"
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default async function DashboardPage() {
  const session = await auth()
  const orgId = session!.user.organizationId!

  const [flowStats, pendingApprovals, recentRuns, resolvedToday, avgMs, checklist] = await Promise.all([
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
    getResolvedTodayCount(orgId),
    getAvgResolutionMs(orgId),
    getOnboardingChecklistState(orgId),
  ])

  const stats = [
    {
      label: "Fluxos ativos",
      value: flowStats[0]?.total ?? 0,
      icon: GitBranch,
      href: "/flows",
      color: "text-[#00AEEF]",
      bg: "bg-[#E0F6FE] dark:bg-[#00AEEF]/15",
    },
    {
      label: "Aprovações pendentes",
      value: pendingApprovals[0]?.total ?? 0,
      icon: CheckSquare,
      href: "/approvals",
      color: "text-[#0D1B4B] dark:text-[#00AEEF]",
      bg: "bg-[#E0F6FE] dark:bg-[#00AEEF]/15",
    },
  ]

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {/* Card 1 — Fluxos ativos */}
          {/* Card 2 — Aprovações pendentes */}
          {stats.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`rounded-lg p-2 ${s.bg}`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-semibold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </Link>
          ))}

          {/* Card 3 — Resolvidas hoje */}
          <Link
            href="/approvals"
            className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="rounded-lg p-2 bg-emerald-50 dark:bg-emerald-900/20">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{resolvedToday}</p>
              <p className="text-sm text-muted-foreground">Resolvidas hoje</p>
            </div>
          </Link>

          {/* Card 4 — Tempo médio (30d) */}
          <div className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm">
            <div className="rounded-lg p-2 bg-[#E0F6FE] dark:bg-[#00AEEF]/15">
              <Clock className="h-5 w-5 text-[#00AEEF]" aria-hidden="true" />
            </div>
            <div>
              {avgMs === null ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <p className="text-2xl font-semibold cursor-help">—</p>
                    </TooltipTrigger>
                    <TooltipContent className="text-sm max-w-xs">
                      Sem aprovações resolvidas nos últimos 30 dias
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <p className="text-2xl font-semibold">{formatAvgTime(avgMs)}</p>
              )}
              <p className="text-sm text-muted-foreground">Tempo médio (30d)</p>
            </div>
          </div>
        </div>

        {/* Onboarding Checklist — visible per D-10 literal */}
        {checklist.shouldShow && (
          <div className="mt-6">
            <OnboardingChecklist
              whatsappClicked={checklist.whatsappClicked}
              processConfigured={checklist.processConfigured}
              firstApproval={checklist.firstApproval}
              whatsappLink={process.env.SUPPORT_WHATSAPP_LINK ?? "#"}
            />
          </div>
        )}

        {/* Execuções recentes */}
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b px-6 py-4">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold">Execuções recentes</h2>
          </div>
          <div className="divide-y">
            {recentRuns.length === 0 && (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                Nenhuma execução registrada ainda.
              </p>
            )}
            {recentRuns.map((run) => (
              <div key={run.id} className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-3">
                  <StatusDot status={run.status} />
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

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    success: "bg-[#00AEEF]",
    error: "bg-red-500",
    running: "bg-[#5CCFF5] animate-pulse",
    waiting: "bg-[#0D1B4B]",
  }
  return <span className={`h-2 w-2 rounded-full ${colors[status] ?? "bg-gray-400"}`} />
}
