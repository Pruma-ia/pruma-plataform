import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { approvals, approvalFiles, approvalEvents, users } from "../../../../../db/schema"
import { eq, and, asc, exists } from "drizzle-orm"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { after } from "next/server"
import { Header } from "@/components/dashboard/header"
import { getOrgHeaderData } from "@/lib/org-header-data"
import { ApprovalDetail } from "./approval-detail"
import { ApprovalTimeline } from "./approval-timeline"

export default async function ApprovalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  const orgId = session!.user.organizationId!

  const orgHeader = await getOrgHeaderData(orgId)

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

  const eventRows = await db
    .select({
      id: approvalEvents.id,
      eventType: approvalEvents.eventType,
      actorType: approvalEvents.actorType,
      actorId: approvalEvents.actorId,
      actorName: users.name,
      metadata: approvalEvents.metadata,
      createdAt: approvalEvents.createdAt,
    })
    .from(approvalEvents)
    .leftJoin(users, eq(approvalEvents.actorId, users.id))
    .where(eq(approvalEvents.approvalId, id))
    .orderBy(asc(approvalEvents.createdAt))

  after(async () => {
    const userId = session!.user.id
    const alreadyViewed = await db
      .select({ id: approvalEvents.id })
      .from(approvalEvents)
      .where(
        and(
          eq(approvalEvents.approvalId, id),
          eq(approvalEvents.eventType, "approval_viewed"),
          eq(approvalEvents.actorId, userId),
        )
      )
      .limit(1)
    if (alreadyViewed.length === 0) {
      await db.insert(approvalEvents).values({
        approvalId: id,
        eventType: "approval_viewed",
        actorType: "user",
        actorId: userId,
      })
    }
  })

  return (
    <div>
      <Header title="Detalhes da Aprovação" orgName={orgHeader.name} orgLogoUrl={orgHeader.logoUrl} />
      <div className="p-6">
        <Link
          href="/approvals"
          className="mb-5 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar para aprovações
        </Link>
        <ApprovalDetail
          approval={row}
          canResolve={row.status === "pending"}
          fileCount={fileRows.length}
          timeline={<ApprovalTimeline events={eventRows} />}
        />
      </div>
    </div>
  )
}
