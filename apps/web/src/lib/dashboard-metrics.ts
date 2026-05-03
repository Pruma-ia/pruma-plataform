import { and, count, eq, gte, inArray, sql } from "drizzle-orm"
import { db } from "./db"
import { approvals, flows, organizations } from "../../db/schema"

// Use the literal tuple typed as the enum so inArray overload resolves correctly
const RESOLVED_STATUSES = ["approved", "rejected"] as Array<"approved" | "rejected" | "pending">

/**
 * Count approvals resolved today (status IN ('approved','rejected') AND updatedAt >= start-of-UTC-day).
 * Multi-tenant: scoped by orgId.
 */
export async function getResolvedTodayCount(orgId: string): Promise<number> {
  const startOfDayUtc = new Date()
  startOfDayUtc.setUTCHours(0, 0, 0, 0)

  const [row] = await db
    .select({ total: count() })
    .from(approvals)
    .where(
      and(
        eq(approvals.organizationId, orgId),
        inArray(approvals.status, RESOLVED_STATUSES),
        gte(approvals.updatedAt, startOfDayUtc),
      ),
    )
  return Number(row?.total ?? 0)
}

/**
 * Average resolution time in ms over last 30 days for resolved approvals.
 * Returns null when there are no resolved approvals in the period.
 * Multi-tenant: scoped by orgId.
 */
export async function getAvgResolutionMs(orgId: string): Promise<number | null> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const [row] = await db
    .select({
      avgMs: sql<number | null>`AVG(EXTRACT(EPOCH FROM (${approvals.updatedAt} - ${approvals.createdAt})) * 1000)`,
    })
    .from(approvals)
    .where(
      and(
        eq(approvals.organizationId, orgId),
        inArray(approvals.status, RESOLVED_STATUSES),
        gte(approvals.updatedAt, thirtyDaysAgo),
      ),
    )
  const v = row?.avgMs
  if (v === null || v === undefined) return null
  return Number(v)
}

/**
 * Format average resolution time for display.
 * - null → "—"
 * - < 60 min → "{N}min"
 * - < 24h → "{N}h"
 * - else → "{N}d"
 */
export function formatAvgTime(ms: number | null): string {
  if (ms === null) return "—"
  const minutes = Math.round(ms / 60_000)
  if (minutes < 60) return `${minutes}min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.round(hours / 24)}d`
}

export interface OnboardingChecklistState {
  whatsappClicked: boolean
  processConfigured: boolean
  firstApproval: boolean
  flowCount: number
  approvalCount: number
  allDone: boolean
  shouldShow: boolean
}

/**
 * Derive onboarding checklist state from DB.
 * - whatsappClicked = organizations.onboardingWhatsappClickedAt IS NOT NULL
 * - processConfigured = flows.count > 0
 * - firstApproval = approvals.count > 0
 * - allDone = all three complete
 * - shouldShow per D-10 literal: (flowCount === 0 && approvalCount === 0) || !allDone
 *   Hides ONLY when allDone=true. whatsappClicked does NOT condition visibility.
 * Multi-tenant: scoped by orgId.
 */
export async function getOnboardingChecklistState(orgId: string): Promise<OnboardingChecklistState> {
  const [orgRow, flowRow, approvalRow] = await Promise.all([
    db
      .select({ clickedAt: organizations.onboardingWhatsappClickedAt })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1)
      .then((r) => r[0]),
    db
      .select({ total: count() })
      .from(flows)
      .where(eq(flows.organizationId, orgId))
      .then((r) => r[0]),
    db
      .select({ total: count() })
      .from(approvals)
      .where(eq(approvals.organizationId, orgId))
      .then((r) => r[0]),
  ])

  const whatsappClicked = orgRow?.clickedAt != null
  const flowCount = Number(flowRow?.total ?? 0)
  const approvalCount = Number(approvalRow?.total ?? 0)
  const processConfigured = flowCount > 0
  const firstApproval = approvalCount > 0
  const allDone = whatsappClicked && processConfigured && firstApproval

  // D-10 LITERAL: visible for fresh orgs (no flows + no approvals) OR whenever incomplete.
  // D-11 LITERAL: hidden only when allDone.
  // whatsappClicked does NOT condition visibility — it only affects per-item visual state.
  const shouldShow = (flowCount === 0 && approvalCount === 0) || !allDone

  return {
    whatsappClicked,
    processConfigured,
    firstApproval,
    flowCount,
    approvalCount,
    allDone,
    shouldShow,
  }
}
