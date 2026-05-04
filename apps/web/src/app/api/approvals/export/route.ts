import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { approvals, users, flows } from "../../../../../db/schema"
import { and, eq, gte, lte, ilike, desc } from "drizzle-orm"

// ── CSV helpers (RFC 4180 + injection-safety) ─────────────────────────────────

/** Wraps value in double-quotes, doubling any internal double-quotes (RFC 4180). */
function csvEscape(v: string): string {
  return `"${v.replace(/"/g, '""')}"`
}

/** Prefixes formula-starting characters with a space to prevent CSV injection in Excel/Sheets. */
function csvSafe(v: string): string {
  return /^[=+\-@]/.test(v) ? ` ${v}` : v
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = session.user.organizationId
  const { searchParams: sp } = new URL(req.url)

  // ── Build WHERE conditions — orgId ALWAYS first (T-02-03 mandatory) ─────────
  const conditions = [eq(approvals.organizationId, orgId)]

  const status = sp.get("status")
  if (status) {
    conditions.push(eq(approvals.status, status as "pending" | "approved" | "rejected"))
  }

  const flowId = sp.get("flowId")
  if (flowId) {
    conditions.push(eq(approvals.flowId, flowId))
  }

  const dateFrom = sp.get("dateFrom")
  if (dateFrom) {
    const d = new Date(dateFrom)
    if (!isNaN(d.getTime())) conditions.push(gte(approvals.createdAt, d))
  }

  const dateTo = sp.get("dateTo")
  if (dateTo) {
    const d = new Date(dateTo)
    if (!isNaN(d.getTime())) conditions.push(lte(approvals.createdAt, d))
  }

  const q = sp.get("q")
  if (q) {
    conditions.push(ilike(approvals.title, `%${q}%`))
  }

  // ── Query — no LIMIT (full export) ───────────────────────────────────────────
  const rows = await db
    .select({
      id: approvals.id,
      title: approvals.title,
      status: approvals.status,
      flowName: flows.name,
      createdAt: approvals.createdAt,
      resolvedByName: users.name,
      comment: approvals.comment,
    })
    .from(approvals)
    .leftJoin(users, eq(approvals.resolvedBy, users.id))
    .leftJoin(flows, eq(approvals.flowId, flows.id))
    .where(and(...conditions))
    .orderBy(desc(approvals.createdAt))

  // ── Serialize CSV ─────────────────────────────────────────────────────────────
  const header = "ID,Título,Status,Fluxo,Data,Resolvido Por,Comentário\n"
  const body = rows
    .map((r) =>
      [
        r.id,
        csvEscape(csvSafe(r.title ?? "")),
        r.status,
        csvEscape(r.flowName ?? ""),
        r.createdAt.toISOString(),
        csvEscape(r.resolvedByName ?? ""),
        csvEscape(csvSafe(r.comment ?? "")),
      ].join(",")
    )
    .join("\n")

  return new Response(header + body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="aprovacoes-${Date.now()}.csv"`,
    },
  })
}
