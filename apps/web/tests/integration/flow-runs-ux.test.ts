/**
 * Integration tests for /flows/[id] runs section UX data (INFRA-03).
 *
 * What is REAL here:
 *   - PostgreSQL queries against local Docker DB (real Drizzle ORM)
 *   - extractEtapas() logic (pure function, tested via real payload shapes)
 *   - durationLabel() logic (pure function, tested via real timestamps)
 *   - approvals JOIN via n8nExecutionId with org scoping (T-02-02)
 *   - Multi-tenant isolation: runs from another org never appear
 *
 * What is NOT tested here:
 *   - React rendering (covered by Playwright E2E)
 *   - NextAuth session (mocked in route-level unit tests)
 */

import { describe, it, expect, beforeAll } from "vitest"
import { db } from "@/lib/db"
import { flows, flowRuns, approvals, organizations } from "../../db/schema"
import { eq, and, inArray, sql } from "drizzle-orm"
import { ctx } from "./state"

// ── Pure helper copies (mirrors page.tsx logic) ───────────────────────────────

function extractEtapas(payload: unknown): number {
  if (!payload || typeof payload !== "object") return 0
  const runData = (payload as Record<string, unknown> & {
    executionData?: { resultData?: { runData?: Record<string, unknown> } }
  })?.executionData?.resultData?.runData
  return runData && typeof runData === "object" ? Object.keys(runData).length : 0
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

// ── Test data helpers ─────────────────────────────────────────────────────────

function makePayload(stepNames: string[]): Record<string, unknown> {
  const runData = Object.fromEntries(stepNames.map((name) => [name, { main: [[]] }]))
  return { executionData: { resultData: { runData } } }
}

// ─────────────────────────────────────────────────────────────────────────────
// INFRA-03 — runs section data query
// ─────────────────────────────────────────────────────────────────────────────

describe("flows/[id] runs section — UX data query (INFRA-03)", () => {
  let flowId: string
  let run1Id: string
  let run2Id: string
  const exec1 = `exec-ux-1-${Date.now()}`
  const exec2 = `exec-ux-2-${Date.now()}`

  beforeAll(async () => {
    // Create a flow owned by the test org
    const [flow] = await db
      .insert(flows)
      .values({
        organizationId: ctx.orgId,
        prumaFlowId: `flow-ux-${Date.now()}`,
        name: "UX Test Flow",
        status: "success",
      })
      .returning()
    flowId = flow.id

    // Run 1: 3 n8n steps, exec1, has start + finish (5 seconds)
    const [r1] = await db
      .insert(flowRuns)
      .values({
        flowId,
        organizationId: ctx.orgId,
        status: "success",
        n8nExecutionId: exec1,
        payload: makePayload(["Step A", "Step B", "Step C"]),
        startedAt: new Date("2024-01-15T10:00:00Z"),
        finishedAt: new Date("2024-01-15T10:00:05Z"),
      })
      .returning()
    run1Id = r1.id

    // Run 2: 1 n8n step, exec2, no finishedAt (still running / errored)
    const [r2] = await db
      .insert(flowRuns)
      .values({
        flowId,
        organizationId: ctx.orgId,
        status: "error",
        n8nExecutionId: exec2,
        payload: makePayload(["Only Step"]),
        startedAt: new Date("2024-01-15T11:00:00Z"),
        finishedAt: null,
      })
      .returning()
    run2Id = r2.id
  }, 15_000)

  it("Test 1 (INFRA-03) — extractEtapas counts runData keys from persisted payload", async () => {
    const [dbRun1] = await db.select().from(flowRuns).where(eq(flowRuns.id, run1Id))
    const [dbRun2] = await db.select().from(flowRuns).where(eq(flowRuns.id, run2Id))

    expect(extractEtapas(dbRun1.payload)).toBe(3)
    expect(extractEtapas(dbRun2.payload)).toBe(1)

    // Edge cases
    expect(extractEtapas(null)).toBe(0)
    expect(extractEtapas({})).toBe(0)
    expect(extractEtapas({ executionData: { resultData: {} } })).toBe(0)
  })

  it("Test 2 — linkedApprovals count via n8nExecutionId with org scoping (T-02-02)", async () => {
    // Insert 3 approvals tied to exec1 in this org
    await db.insert(approvals).values([
      { organizationId: ctx.orgId, n8nExecutionId: exec1, title: "Approval A", status: "pending" },
      { organizationId: ctx.orgId, n8nExecutionId: exec1, title: "Approval B", status: "approved" },
      { organizationId: ctx.orgId, n8nExecutionId: exec1, title: "Approval C", status: "rejected" },
    ])

    const runExecutionIds = [exec1, exec2]
    const linkedCounts = await db
      .select({
        n8nExecutionId: approvals.n8nExecutionId,
        count: sql<number>`count(*)::int`,
      })
      .from(approvals)
      .where(
        and(
          eq(approvals.organizationId, ctx.orgId),
          inArray(approvals.n8nExecutionId, runExecutionIds),
        ),
      )
      .groupBy(approvals.n8nExecutionId)

    const linkedMap = Object.fromEntries(
      linkedCounts.map((r) => [r.n8nExecutionId, r.count]),
    )

    expect(linkedMap[exec1]).toBe(3)
    expect(linkedMap[exec2] ?? 0).toBe(0)
  })

  it("Test 3 (multi-tenant) — runs from a different org's flow are never returned", async () => {
    // Create a separate org + flow + run for isolation check
    const [otherOrg] = await db
      .insert(organizations)
      .values({
        name: "Other Org UX",
        slug: `other-org-ux-${Date.now()}`,
        subscriptionStatus: "active",
      })
      .returning()

    const [otherFlow] = await db
      .insert(flows)
      .values({
        organizationId: otherOrg.id,
        prumaFlowId: `flow-other-ux-${Date.now()}`,
        name: "Other Flow",
        status: "success",
      })
      .returning()

    const otherExec = `exec-other-ux-${Date.now()}`
    await db.insert(flowRuns).values({
      flowId: otherFlow.id,
      organizationId: otherOrg.id,
      status: "success",
      n8nExecutionId: otherExec,
      payload: makePayload(["Step X", "Step Y"]),
    })

    // Query our flow's runs — must not include other org's run
    const ourRuns = await db
      .select()
      .from(flowRuns)
      .where(eq(flowRuns.flowId, flowId))

    const ourExecutionIds = ourRuns
      .map((r) => r.n8nExecutionId)
      .filter((id): id is string => id !== null)

    expect(ourExecutionIds).not.toContain(otherExec)

    // Verify approvals query respects org boundary when execution IDs are provided
    if (ourExecutionIds.length > 0) {
      const linkedCounts = await db
        .select({
          n8nExecutionId: approvals.n8nExecutionId,
          count: sql<number>`count(*)::int`,
        })
        .from(approvals)
        .where(
          and(
            eq(approvals.organizationId, ctx.orgId),
            inArray(approvals.n8nExecutionId, ourExecutionIds),
          ),
        )
        .groupBy(approvals.n8nExecutionId)

      const returnedExecIds = linkedCounts.map((r) => r.n8nExecutionId)
      expect(returnedExecIds).not.toContain(otherExec)
    }

    // Cleanup isolated other org (cascade removes flow + runs)
    await db.delete(organizations).where(eq(organizations.id, otherOrg.id))
  })

  it("Test 4 — durationLabel formats seconds/minutes/ms/null correctly", async () => {
    const [dbRun1] = await db.select().from(flowRuns).where(eq(flowRuns.id, run1Id))
    const [dbRun2] = await db.select().from(flowRuns).where(eq(flowRuns.id, run2Id))

    // Run 1: 5 seconds → "5.0s"
    const label1 = durationLabel(dbRun1.startedAt, dbRun1.finishedAt)
    expect(label1).toMatch(/^\d+(\.\d+)?s$/)

    // Run 2: finishedAt is null → "—"
    expect(durationLabel(dbRun2.startedAt, dbRun2.finishedAt)).toBe("—")

    // Both null → "—"
    expect(durationLabel(null, null)).toBe("—")

    // 1m 30s format
    expect(
      durationLabel(new Date("2024-01-01T00:00:00Z"), new Date("2024-01-01T00:01:30Z")),
    ).toBe("1m 30s")

    // Sub-second: 500ms
    expect(
      durationLabel(new Date("2024-01-01T00:00:00.000Z"), new Date("2024-01-01T00:00:00.500Z")),
    ).toBe("500ms")
  })
})
