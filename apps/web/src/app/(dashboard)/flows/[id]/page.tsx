import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { flows, flowRuns } from "../../../../../db/schema"
import { eq, and, desc } from "drizzle-orm"
import { Header } from "@/components/dashboard/header"
import { getOrgHeaderData } from "@/lib/org-header-data"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

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
              <dd className="mt-1 text-sm font-medium capitalize">{flow.status}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Última execução</dt>
              <dd className="mt-1 text-sm">
                {flow.lastRunAt ? new Date(flow.lastRunAt).toLocaleString("pt-BR") : "—"}
              </dd>
            </div>
          </dl>
          {flow.metadata != null && (
            <div className="mt-4">
              <dt className="text-xs text-muted-foreground mb-1">Metadata</dt>
              <pre className="rounded-lg bg-muted p-3 text-xs overflow-auto max-h-40">
                {JSON.stringify(flow.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Histórico */}
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold">Histórico de execuções</h2>
          </div>
          <div className="divide-y">
            {runs.map((run) => (
              <div key={run.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{run.status}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(run.createdAt).toLocaleString("pt-BR")}
                  </span>
                </div>
                {run.errorMessage && (
                  <p className="mt-1 text-xs text-destructive">{run.errorMessage}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
