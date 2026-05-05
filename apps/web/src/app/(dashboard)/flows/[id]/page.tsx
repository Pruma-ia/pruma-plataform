import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { flows, flowRuns, approvals } from "../../../../../db/schema"
import { eq, and, desc, inArray, sql } from "drizzle-orm"
import { Header } from "@/components/dashboard/header"
import { getOrgHeaderData } from "@/lib/org-header-data"
import { notFound } from "next/navigation"
import { ArrowLeft, Activity } from "lucide-react"
import Link from "next/link"

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractEtapas(payload: unknown): number {
  if (!payload || typeof payload !== "object") return 0
  const p = payload as Record<string, unknown>
  // Native n8n execution payload
  const runData = (p as { executionData?: { resultData?: { runData?: Record<string, unknown> } } })
    ?.executionData?.resultData?.runData
  if (runData && typeof runData === "object") return Object.keys(runData).length
  // Simplified/seed format: { etapas: string[] }
  if (Array.isArray(p.etapas)) return p.etapas.length
  return 0
}

function durationLabel(startedAt: Date | null, finishedAt: Date | null): string {
  if (!startedAt || !finishedAt) return "—"
  const ms = finishedAt.getTime() - startedAt.getTime()
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const min = Math.floor(ms / 60_000)
  const sec = Math.floor((ms % 60_000) / 1000)
  return `${min}m ${sec}s`
}

function statusBadge(status: string) {
  switch (status) {
    case "success":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          Sucesso
        </span>
      )
    case "error":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
          Erro
        </span>
      )
    case "running":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          Em execução
        </span>
      )
    case "waiting":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          Aguardando
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground capitalize">
          {status}
        </span>
      )
  }
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function FlowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const orgId = session!.user.organizationId!

  const orgHeader = await getOrgHeaderData(orgId)

  const [flow] = await db
    .select()
    .from(flows)
    .where(and(eq(flows.id, id), eq(flows.organizationId, orgId)))

  if (!flow) notFound()

  const runs = await db
    .select()
    .from(flowRuns)
    .where(eq(flowRuns.flowId, flow.id))
    .orderBy(desc(flowRuns.createdAt))
    .limit(20)

  // Batch-query linked approvals by n8nExecutionId (per RESEARCH Pitfall 5)
  const runExecutionIds = runs
    .map((r) => r.n8nExecutionId)
    .filter((execId): execId is string => execId !== null)

  const linkedCounts =
    runExecutionIds.length > 0
      ? await db
          .select({
            n8nExecutionId: approvals.n8nExecutionId,
            count: sql<number>`count(*)::int`,
          })
          .from(approvals)
          .where(
            and(
              eq(approvals.organizationId, orgId),
              inArray(approvals.n8nExecutionId, runExecutionIds),
            ),
          )
          .groupBy(approvals.n8nExecutionId)
      : []

  const linkedMap = Object.fromEntries(linkedCounts.map((r) => [r.n8nExecutionId, r.count]))

  return (
    <div>
      <Header title={flow.name} orgName={orgHeader.name} orgLogoUrl={orgHeader.logoUrl} />
      <div className="p-6 space-y-6">
        <Link
          href="/flows"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        {/* Info */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Pruma Flow ID</dt>
              <dd className="mt-1 font-mono text-sm">{flow.prumaFlowId}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Status</dt>
              <dd className="mt-1">{statusBadge(flow.status)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Última execução</dt>
              <dd className="mt-1 text-sm">
                {flow.lastRunAt ? new Date(flow.lastRunAt).toLocaleString("pt-BR") : "—"}
              </dd>
            </div>
          </dl>
          {flow.metadata != null && (() => {
            const meta = flow.metadata as Record<string, unknown>
            const etapas = Array.isArray(meta.etapas) ? (meta.etapas as string[]) : null
            if (etapas) {
              return (
                <div className="mt-4">
                  <dt className="text-xs text-muted-foreground mb-2">Etapas do fluxo</dt>
                  <dd className="flex flex-wrap gap-2">
                    {etapas.map((e, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-full bg-[#E0F6FE] px-3 py-1 text-xs font-medium text-[#0D1B4B] dark:bg-[#00AEEF]/15 dark:text-[#5CCFF5]"
                      >
                        <span className="tabular-nums text-[10px] opacity-60">{i + 1}</span>
                        {e}
                      </span>
                    ))}
                  </dd>
                </div>
              )
            }
            return (
              <details className="mt-4">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Metadata técnico
                </summary>
                <pre className="mt-2 rounded-lg bg-muted p-3 text-xs overflow-auto max-h-40">
                  {JSON.stringify(meta, null, 2)}
                </pre>
              </details>
            )
          })()}
        </div>

        {/* Execuções recentes */}
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="border-b px-6 py-4 flex items-baseline justify-between">
            <h2 className="font-heading text-xl font-semibold">Execuções recentes</h2>
            <p className="text-xs text-muted-foreground">Últimas 20 execuções</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Data
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Etapas
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Aprovações
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Duração
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Activity className="h-8 w-8 opacity-40" />
                        <p className="text-sm">Nenhuma execução ainda</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  runs.flatMap((run) => {
                    const etapas = extractEtapas(run.payload)
                    const linked = linkedMap[run.n8nExecutionId ?? ""] ?? 0
                    const duration = durationLabel(run.startedAt, run.finishedAt)

                    const rows = [
                      <tr key={run.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                          {new Date(run.createdAt).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3">{statusBadge(run.status)}</td>
                        <td className="px-4 py-3 text-sm tabular-nums">
                          {etapas > 0 ? etapas : "—"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {linked > 0 ? (
                            <Link
                              href={`/approvals?executionId=${run.n8nExecutionId}`}
                              className="text-[#00AEEF] hover:underline tabular-nums"
                            >
                              {linked} {linked === 1 ? "aprovação" : "aprovações"}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">
                          {duration}
                        </td>
                      </tr>,
                    ]

                    if (run.errorMessage) {
                      rows.push(
                        <tr key={`${run.id}-error`}>
                          <td colSpan={5}>
                            <p className="px-4 pb-3 text-xs text-destructive">
                              {run.errorMessage}
                            </p>
                          </td>
                        </tr>,
                      )
                    }

                    return rows
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
