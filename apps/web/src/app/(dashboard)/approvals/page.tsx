import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { approvals, approvalFiles, users } from "../../../../db/schema"
import { eq, desc } from "drizzle-orm"
import { Header } from "@/components/dashboard/header"
import { ApprovalsList } from "./approvals-list"
import { getOrgHeaderData } from "@/lib/org-header-data"

export default async function ApprovalsPage() {
  const session = await auth()
  const orgId = session!.user.organizationId!

  const orgHeader = await getOrgHeaderData(orgId)

  const rows = await db
    .select({
      id: approvals.id,
      title: approvals.title,
      description: approvals.description,
      status: approvals.status,
      expiresAt: approvals.expiresAt,
      createdAt: approvals.createdAt,
      resolvedAt: approvals.resolvedAt,
      resolvedByName: users.name,
    })
    .from(approvals)
    .leftJoin(users, eq(approvals.resolvedBy, users.id))
    .where(eq(approvals.organizationId, orgId))
    .orderBy(desc(approvals.createdAt))

  const fileRows = rows.length > 0
    ? await db
        .select({ approvalId: approvalFiles.approvalId, id: approvalFiles.id })
        .from(approvalFiles)
        .where(eq(approvalFiles.organizationId, orgId))
    : []
  const fileCountMap = fileRows.reduce<Record<string, number>>((acc, f) => {
    acc[f.approvalId] = (acc[f.approvalId] ?? 0) + 1
    return acc
  }, {})

  return (
    <div>
      <Header title="Aprovações" orgName={orgHeader.name} orgLogoUrl={orgHeader.logoUrl} />
      <ApprovalsList approvals={rows} fileCounts={fileCountMap} />
    </div>
  )
}
