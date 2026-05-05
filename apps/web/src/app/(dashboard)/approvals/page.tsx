import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { approvals, approvalFiles, users, flows } from "../../../../db/schema"
import { eq, desc, and, gte, lt, ilike, sql } from "drizzle-orm"
import { Header } from "@/components/dashboard/header"
import { ApprovalsSearchBar } from "./approvals-search-bar"
import { ApprovalsFilters } from "./approvals-filters"
import { ApprovalsTable } from "./approvals-table"
import { getOrgHeaderData } from "@/lib/org-header-data"
import { Download } from "lucide-react"

const PAGE_SIZE = 10

// ── Status pill config ────────────────────────────────────────────────────────

const STAT_CONFIG: {
  label: string
  value: string | null
  dot: string
  text: string
}[] = [
  { label: "Total", value: null, dot: "bg-foreground/30", text: "text-foreground" },
  {
    label: "Pendentes",
    value: "pending",
    dot: "bg-amber-400",
    text: "text-amber-700 dark:text-amber-400",
  },
  { label: "Aprovadas", value: "approved", dot: "bg-[#00AEEF]", text: "text-[#00AEEF]" },
  {
    label: "Rejeitadas",
    value: "rejected",
    dot: "bg-red-400",
    text: "text-red-500 dark:text-red-400",
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  // Pitfall 1: searchParams is a Promise in Next.js 16 — must await
  const sp = await searchParams
  const session = await auth()
  const orgId = session!.user.organizationId!

  const orgHeader = await getOrgHeaderData(orgId)

  const page = Math.max(1, parseInt(sp.page ?? "1", 10))

  // ── Build WHERE conditions — orgId always first (multi-tenant isolation) ─────
  // baseConditions: all filters except status — used for status pill counts
  const baseConditions = [eq(approvals.organizationId, orgId)]

  if (sp.flowId) {
    baseConditions.push(eq(approvals.flowId, sp.flowId))
  }
  if (sp.dateFrom) {
    // 00:00 BRT = 03:00 UTC (UTC-3)
    const d = new Date(sp.dateFrom + "T03:00:00Z")
    if (!isNaN(d.getTime())) baseConditions.push(gte(approvals.createdAt, d))
  }
  if (sp.dateTo) {
    // end of day BRT = next day 03:00 UTC
    const d = new Date(sp.dateTo + "T03:00:00Z")
    if (!isNaN(d.getTime())) {
      d.setDate(d.getDate() + 1)
      baseConditions.push(lt(approvals.createdAt, d))
    }
  }
  if (sp.q) {
    baseConditions.push(ilike(approvals.title, `%${sp.q}%`))
  }

  const conditions = sp.status
    ? [...baseConditions, eq(approvals.status, sp.status as "pending" | "approved" | "rejected")]
    : baseConditions

  // ── Parallel fetch: rows + total count + org flows + file counts + status pills
  const [rows, [{ total }], orgFlows, fileRows, statusCounts] = await Promise.all([
    db
      .select({
        id: approvals.id,
        title: approvals.title,
        description: approvals.description,
        status: approvals.status,
        expiresAt: approvals.expiresAt,
        createdAt: approvals.createdAt,
        resolvedAt: approvals.resolvedAt,
        resolvedByName: users.name,
        flowName: flows.name,
      })
      .from(approvals)
      .leftJoin(users, eq(approvals.resolvedBy, users.id))
      .leftJoin(flows, eq(approvals.flowId, flows.id))
      .where(and(...conditions))
      .orderBy(desc(approvals.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),

    db
      .select({ total: sql<number>`count(*)::int` })
      .from(approvals)
      .where(and(...conditions)),

    // Org flows for filter select dropdown
    db
      .select({ id: flows.id, name: flows.name })
      .from(flows)
      .where(eq(flows.organizationId, orgId))
      .orderBy(flows.name),

    // File counts for attachment indicators
    db
      .select({ approvalId: approvalFiles.approvalId, id: approvalFiles.id })
      .from(approvalFiles)
      .where(eq(approvalFiles.organizationId, orgId)),

    // Status counts for pills — apply base filters (date/flow/q) so counts match current view
    db
      .select({ status: approvals.status, count: sql<number>`count(*)::int` })
      .from(approvals)
      .where(and(...baseConditions))
      .groupBy(approvals.status),
  ])

  const fileCountMap = fileRows.reduce<Record<string, number>>((acc, f) => {
    acc[f.approvalId] = (acc[f.approvalId] ?? 0) + 1
    return acc
  }, {})

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const countsByStatus = statusCounts.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = r.count
    return acc
  }, {})
  const totalOrgCount = Object.values(countsByStatus).reduce((a, b) => a + b, 0)


  // Build current search params string (for export link + pagination hrefs)
  const currentSearchParams = new URLSearchParams(
    Object.entries(sp).filter(([, v]) => v != null) as [string, string][]
  ).toString()

  const hasActiveFilters = !!(sp.flowId || sp.dateFrom || sp.dateTo || sp.q || sp.status)

  return (
    <div>
      <Header title="Aprovações" orgName={orgHeader.name} orgLogoUrl={orgHeader.logoUrl} />

      <div className="p-6 space-y-4">
        {/* Toolbar — line 1: search + flow filter + date filters */}
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <ApprovalsSearchBar defaultValue={sp.q} />

            <ApprovalsFilters
              orgFlows={orgFlows}
              defaultFlowId={sp.flowId}
              defaultDateFrom={sp.dateFrom}
              defaultDateTo={sp.dateTo}
            />

            {hasActiveFilters && (
              <a
                href="/approvals"
                className="inline-flex items-center h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground hover:bg-muted/40 transition-colors"
              >
                Limpar filtros
              </a>
            )}
          </div>

          {/* Line 2: status pills + export button */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex flex-wrap gap-2">
              {STAT_CONFIG.map((s) => {
                const count = s.value === null ? totalOrgCount : (countsByStatus[s.value] ?? 0)
                const isActive = (sp.status ?? null) === s.value
                const pillParams = new URLSearchParams()
                if (sp.q) pillParams.set("q", sp.q)
                if (sp.dateFrom) pillParams.set("dateFrom", sp.dateFrom)
                if (sp.dateTo) pillParams.set("dateTo", sp.dateTo)
                if (sp.flowId) pillParams.set("flowId", sp.flowId)
                if (s.value) pillParams.set("status", s.value)
                const pillStr = pillParams.toString()
                const href = pillStr ? `/approvals?${pillStr}` : "/approvals"
                return (
                  <a
                    key={s.value ?? "all"}
                    href={href}
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-all ${
                      isActive
                        ? "border-[#00AEEF]/40 bg-[#00AEEF]/8 shadow-sm"
                        : "border-border bg-card hover:bg-muted/40"
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className={`font-semibold tabular-nums ${s.text}`}>{count}</span>
                  </a>
                )
              })}
            </div>

            <a
              href={`/api/approvals/export?${currentSearchParams}`}
              download
              className="inline-flex items-center gap-1.5 h-9 rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </a>
          </div>
        </div>

        {/* Table with pagination footer */}
        <ApprovalsTable
          approvals={rows}
          fileCounts={fileCountMap}
          totalPages={totalPages}
          currentPage={page}
          totalCount={total}
          pageSize={PAGE_SIZE}
          currentSearchParams={currentSearchParams}
        />
      </div>
    </div>
  )
}
