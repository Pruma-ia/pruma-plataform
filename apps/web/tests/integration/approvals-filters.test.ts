/**
 * Integration tests for APPROV-01/02/03/04 — approvals filter, search, pagination, and CSV export.
 *
 * What is REAL here:
 *   - PostgreSQL queries (real Drizzle ORM against local Docker DB)
 *   - Drizzle WHERE clause conditions: status, flowId, dateFrom, dateTo, ILIKE q
 *   - CSV export route handler
 *   - FK constraints, cascade behaviour
 *   - Multi-tenant isolation (T-02-02)
 *
 * What is MOCKED:
 *   - auth() → injects test session (NextAuth can't run in test context)
 */

import "./env"
import { describe, test, expect, vi, beforeAll, afterAll } from "vitest"

// ── Mocks (vi.mock is hoisted — must be before real imports) ──────────────────

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock("@/lib/auth", () => ({ auth: mockAuth }))

vi.mock("@/lib/r2", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/r2")>()
  return {
    ...actual,
    presignUploadUrl: vi.fn().mockResolvedValue("https://minio.test/upload/presigned"),
    presignReadUrl: vi.fn().mockResolvedValue("https://minio.test/read/presigned"),
    deleteObject: vi.fn().mockResolvedValue(undefined),
  }
})

// ── Real imports ──────────────────────────────────────────────────────────────

import { db } from "@/lib/db"
import { approvals, flows, organizations } from "../../db/schema"
import { eq } from "drizzle-orm"
import { ctx } from "./state"

import { GET as exportGET } from "@/app/api/approvals/export/route"

// ── Local state for this describe block ──────────────────────────────────────

let flowId: string
let otherOrgId: string
let approvalApprovedId: string
let approvalPendingId: string
let approvalRejectedId: string
let approvalOtherOrgId: string

// ── Helpers ───────────────────────────────────────────────────────────────────

function getReq(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/approvals/export")
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  return new Request(url.toString())
}

function setSession(orgId: string = ctx.orgId) {
  mockAuth.mockResolvedValue({
    user: {
      id: ctx.userId,
      email: "tester@int.pruma",
      organizationId: orgId,
      role: "owner",
      emailVerified: true,
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed data setup
// ─────────────────────────────────────────────────────────────────────────────

describe("Approvals filters, search, pagination, and CSV export", () => {
  beforeAll(async () => {
    // Create a flow for flowId filter tests
    const [flow] = await db
      .insert(flows)
      .values({
        organizationId: ctx.orgId,
        prumaFlowId: `filter-test-flow-${Date.now()}`,
        name: "Fluxo de Teste Filtros",
        status: "running",
      })
      .returning()
    flowId = flow.id

    // Create a second org for cross-tenant isolation test (T-02-02)
    const ts = Date.now()
    const [otherOrg] = await db
      .insert(organizations)
      .values({
        name: "Other Org Filters Test",
        slug: `other-org-filters-${ts}`,
        subscriptionStatus: "active",
      })
      .returning()
    otherOrgId = otherOrg.id

    // Seed approvals with varied status/flowId/createdAt/title
    const now = new Date()
    const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
    const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000) // tomorrow

    const [approved] = await db
      .insert(approvals)
      .values({
        organizationId: ctx.orgId,
        flowId,
        n8nExecutionId: `exec-filter-approved-${ts}`,
        title: "Aprovação de Pagamento Fornecedor",
        status: "approved",
        createdAt: pastDate,
      })
      .returning()
    approvalApprovedId = approved.id

    const [pending] = await db
      .insert(approvals)
      .values({
        organizationId: ctx.orgId,
        n8nExecutionId: `exec-filter-pending-${ts}`,
        title: "Aprovação Pendente de Contrato",
        status: "pending",
        createdAt: now,
      })
      .returning()
    approvalPendingId = pending.id

    const [rejected] = await db
      .insert(approvals)
      .values({
        organizationId: ctx.orgId,
        flowId,
        n8nExecutionId: `exec-filter-rejected-${ts}`,
        title: "Reembolso Reprovado",
        status: "rejected",
        createdAt: futureDate,
      })
      .returning()
    approvalRejectedId = rejected.id

    // Cross-tenant approval — must NEVER appear in any filter result
    const [otherOrgApproval] = await db
      .insert(approvals)
      .values({
        organizationId: otherOrgId,
        n8nExecutionId: `exec-filter-other-org-${ts}`,
        title: "Aprovação de Outro Tenant",
        status: "approved",
      })
      .returning()
    approvalOtherOrgId = otherOrgApproval.id
  }, 20_000)

  afterAll(async () => {
    // Clean up seeded data
    if (approvalApprovedId) await db.delete(approvals).where(eq(approvals.id, approvalApprovedId))
    if (approvalPendingId) await db.delete(approvals).where(eq(approvals.id, approvalPendingId))
    if (approvalRejectedId) await db.delete(approvals).where(eq(approvals.id, approvalRejectedId))
    if (otherOrgId) await db.delete(organizations).where(eq(organizations.id, otherOrgId))
    if (flowId) await db.delete(flows).where(eq(flows.id, flowId))
  }, 20_000)

  // ── APPROV-01: Filter by status ─────────────────────────────────────────────

  test("APPROV-01 — export with status=approved returns only approved rows for this org", async () => {
    setSession()
    const res = await exportGET(getReq({ status: "approved" }))
    expect(res.status).toBe(200)

    const text = await res.text()
    const lines = text.trim().split("\n")

    // Header + at least our approved row
    expect(lines.length).toBeGreaterThanOrEqual(2)
    // Our approved approval must appear
    expect(text).toContain(approvalApprovedId)
    // Pending and rejected must NOT appear in approved filter
    expect(text).not.toContain(approvalPendingId)
    expect(text).not.toContain(approvalRejectedId)
    // Cross-tenant approval must NEVER appear
    expect(text).not.toContain(approvalOtherOrgId)
  })

  // ── APPROV-02: Filter by flowId + date range ─────────────────────────────────

  test("APPROV-02a — export with flowId returns only approvals for that flow", async () => {
    setSession()
    const res = await exportGET(getReq({ flowId }))
    expect(res.status).toBe(200)

    const text = await res.text()
    // approved and rejected both have flowId; pending does not
    expect(text).toContain(approvalApprovedId)
    expect(text).toContain(approvalRejectedId)
    expect(text).not.toContain(approvalPendingId)
    // Cross-tenant must never appear
    expect(text).not.toContain(approvalOtherOrgId)
  })

  test("APPROV-02b — export with dateFrom filters out rows before that date", async () => {
    setSession()
    // dateFrom = yesterday: approved (7 days ago) should be excluded, pending (now) included
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    const res = await exportGET(getReq({ dateFrom: yesterday }))
    expect(res.status).toBe(200)

    const text = await res.text()
    // pending (today) and rejected (tomorrow) should be included
    expect(text).toContain(approvalPendingId)
    expect(text).toContain(approvalRejectedId)
    // approved (7 days ago) should be excluded
    expect(text).not.toContain(approvalApprovedId)
    expect(text).not.toContain(approvalOtherOrgId)
  })

  // ── APPROV-03: Free text search via ILIKE ────────────────────────────────────

  test("APPROV-03 — export with q=Pagamento matches title substring (ILIKE)", async () => {
    setSession()
    const res = await exportGET(getReq({ q: "Pagamento" }))
    expect(res.status).toBe(200)

    const text = await res.text()
    // Only "Aprovação de Pagamento Fornecedor" matches
    expect(text).toContain(approvalApprovedId)
    expect(text).not.toContain(approvalPendingId)
    expect(text).not.toContain(approvalRejectedId)
    expect(text).not.toContain(approvalOtherOrgId)
  })

  // ── T-02-02: Multi-tenant isolation ─────────────────────────────────────────

  test("T-02-02 — export never returns rows from a different organization", async () => {
    // Session scoped to ctx.orgId — other org's approvals must be invisible
    setSession(ctx.orgId)
    const res = await exportGET(getReq())
    expect(res.status).toBe(200)

    const text = await res.text()
    // Our org's approvals are present
    expect(text).toContain(approvalApprovedId)
    expect(text).toContain(approvalPendingId)
    expect(text).toContain(approvalRejectedId)
    // Cross-tenant approval is absent — the cornerstone of T-02-02
    expect(text).not.toContain(approvalOtherOrgId)
  })

  // ── APPROV-04: CSV format and auth guard ─────────────────────────────────────

  test("APPROV-04 — export returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await exportGET(getReq())
    expect(res.status).toBe(401)
  })

  test("APPROV-04 — export response has correct Content-Type and Content-Disposition headers", async () => {
    setSession()
    const res = await exportGET(getReq())
    expect(res.status).toBe(200)

    const contentType = res.headers.get("Content-Type")
    expect(contentType).toContain("text/csv")
    expect(contentType).toContain("utf-8")

    const disposition = res.headers.get("Content-Disposition")
    expect(disposition).toContain("attachment")
    expect(disposition).toContain("aprovacoes-")
    expect(disposition).toContain(".csv")
  })

  test("APPROV-04 — CSV body has header row with expected columns", async () => {
    setSession()
    const res = await exportGET(getReq())
    const text = await res.text()
    const firstLine = text.split("\n")[0]
    expect(firstLine).toContain("ID")
    expect(firstLine).toContain("Título")
    expect(firstLine).toContain("Status")
  })
})
