import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { approvals, approvalFiles, users } from "../../../../db/schema"
import { eq, desc } from "drizzle-orm"
import { Header } from "@/components/dashboard/header"
import { ApprovalCard } from "./approval-card"

export default async function ApprovalsPage() {
  const session = await auth()
  const orgId = session!.user.organizationId!

  const rows = await db
    .select({
      id: approvals.id,
      title: approvals.title,
      description: approvals.description,
      context: approvals.context,
      status: approvals.status,
      expiresAt: approvals.expiresAt,
      createdAt: approvals.createdAt,
      resolvedAt: approvals.resolvedAt,
      resolvedByName: users.name,
      flowId: approvals.flowId,
      decisionFields: approvals.decisionFields,
      decisionValues: approvals.decisionValues,
    })
    .from(approvals)
    .leftJoin(users, eq(approvals.resolvedBy, users.id))
    .where(eq(approvals.organizationId, orgId))
    .orderBy(desc(approvals.createdAt))

  // Busca contagem de arquivos por aprovação para indicador na UI
  const allIds = rows.map((r) => r.id)
  const fileRows = allIds.length > 0
    ? await db
        .select({ approvalId: approvalFiles.approvalId, id: approvalFiles.id })
        .from(approvalFiles)
        .where(eq(approvalFiles.organizationId, orgId))
    : []
  const fileCountMap = fileRows.reduce<Record<string, number>>((acc, f) => {
    acc[f.approvalId] = (acc[f.approvalId] ?? 0) + 1
    return acc
  }, {})

  const pendingList = rows.filter((a) => a.status === "pending")
  const resolvedList = rows.filter((a) => a.status !== "pending")

  return (
    <div>
      <Header title="Aprovações" />
      <div className="p-6 space-y-6">
        {pendingList.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Pendentes ({pendingList.length})
            </h2>
            <div className="space-y-3">
              {pendingList.map((a) => (
                <ApprovalCard key={a.id} approval={a} canResolve fileCount={fileCountMap[a.id] ?? 0} href={`/approvals/${a.id}`} />
              ))}
            </div>
          </section>
        )}

        {pendingList.length === 0 && (
          <div className="rounded-xl border bg-card p-12 text-center shadow-sm">
            <p className="text-muted-foreground">Nenhuma aprovação pendente.</p>
          </div>
        )}

        {resolvedList.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Histórico
            </h2>
            <div className="space-y-2">
              {resolvedList.map((a) => (
                <ApprovalCard key={a.id} approval={a} canResolve={false} fileCount={fileCountMap[a.id] ?? 0} href={`/approvals/${a.id}`} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
