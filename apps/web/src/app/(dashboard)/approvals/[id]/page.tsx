import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { approvals, approvalFiles, users } from "../../../../../db/schema"
import { eq, and } from "drizzle-orm"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { Header } from "@/components/dashboard/header"
import { ApprovalCard } from "../approval-card"

export default async function ApprovalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  const orgId = session!.user.organizationId!

  const [row] = await db
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
    .where(and(eq(approvals.id, id), eq(approvals.organizationId, orgId)))

  if (!row) notFound()

  const fileRows = await db
    .select({ id: approvalFiles.id })
    .from(approvalFiles)
    .where(and(eq(approvalFiles.approvalId, id), eq(approvalFiles.organizationId, orgId)))

  return (
    <div>
      <Header title="Detalhes da Aprovação" />
      <div className="p-6 max-w-4xl">
        <Link
          href="/approvals"
          className="mb-5 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar para aprovações
        </Link>
        <ApprovalCard
          approval={row}
          canResolve={row.status === "pending"}
          fileCount={fileRows.length}
          autoLoadFiles
        />
      </div>
    </div>
  )
}
