/**
 * Integration tests for APPROV-05 — approval_events audit trail instrumentation.
 *
 * What is REAL here:
 *   - PostgreSQL queries (real Drizzle ORM against local Docker DB)
 *   - Event inserts triggered by actual route handler invocations
 *   - FK constraints: approval_events.approval_id → approvals.id
 *   - Tenant isolation: events joined through approvals.organization_id
 *
 * What is MOCKED:
 *   - auth() → injects test session (NextAuth can't run in test context)
 *   - global.fetch → callback URL doesn't actually exist
 */

import "./env"
import { describe, test, expect, vi, beforeAll, beforeEach } from "vitest"

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
import { approvals, approvalEvents } from "../../db/schema"
import { eq, and } from "drizzle-orm"
import { ctx } from "./state"

import { POST as approvalsPOST } from "@/app/api/n8n/approvals/route"
import { POST as approvePOST } from "@/app/api/approvals/[id]/approve/route"
import { POST as rejectPOST } from "@/app/api/approvals/[id]/reject/route"

// ── Helpers ───────────────────────────────────────────────────────────────────

const N8N_SECRET = "int-test-secret-pruma"
const CALLBACK_URL = "https://n8n.callback.test/webhook/events-test"

function n8nReq(body: object) {
  return new Request("http://localhost/api/n8n", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-n8n-secret": N8N_SECRET },
    body: JSON.stringify(body),
  })
}

function postReq(body: object) {
  return new Request("http://localhost/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

// ─────────────────────────────────────────────────────────────────────────────
// APPROV-05 — approval_events instrumentation
// ─────────────────────────────────────────────────────────────────────────────

describe("APPROV-05 — approval_events instrumentation", () => {
  beforeAll(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true })
  })

  beforeEach(() => {
    mockAuth.mockResolvedValue({
      user: {
        id: ctx.userId,
        email: "tester@int.pruma",
        organizationId: ctx.orgId,
        role: "owner",
        emailVerified: true,
      },
    })
  })

  test("POST /api/n8n/approvals creates approval_created event with actorType=system and actorId=null", async () => {
    const execId = `exec-events-created-${Date.now()}`
    const res = await approvalsPOST(
      n8nReq({
        organizationSlug: ctx.n8nSlug,
        n8nExecutionId: execId,
        callbackUrl: CALLBACK_URL,
        title: "Aprovação para teste de evento created",
      })
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    const approvalId: string = body.approvalId

    const events = await db
      .select()
      .from(approvalEvents)
      .where(eq(approvalEvents.approvalId, approvalId))

    expect(events).toHaveLength(1)
    const event = events[0]
    expect(event.eventType).toBe("approval_created")
    expect(event.actorType).toBe("system")
    expect(event.actorId).toBeNull()
    expect(event.approvalId).toBe(approvalId)
    expect(event.createdAt).toBeDefined()
  })

  test("approve route creates approval_resolved event with actorType=user and metadata.status=approved", async () => {
    const [approval] = await db
      .insert(approvals)
      .values({
        organizationId: ctx.orgId,
        n8nExecutionId: `exec-events-approve-${Date.now()}`,
        callbackUrl: CALLBACK_URL,
        title: "Aprovação para teste approve event",
        status: "pending",
      })
      .returning()

    const res = await approvePOST(
      postReq({ comment: "Aprovado com sucesso", decisionValues: { campo: "opcao-1" } }),
      params(approval.id)
    )
    expect(res.status).toBe(200)

    const events = await db
      .select()
      .from(approvalEvents)
      .where(eq(approvalEvents.approvalId, approval.id))

    expect(events).toHaveLength(1)
    const event = events[0]
    expect(event.eventType).toBe("approval_resolved")
    expect(event.actorType).toBe("user")
    expect(event.actorId).toBe(ctx.userId)
    const metadata = event.metadata as Record<string, unknown>
    expect(metadata.status).toBe("approved")
    expect(metadata.comment).toBe("Aprovado com sucesso")
    expect(metadata.decisionValues).toEqual({ campo: "opcao-1" })
  })

  test("reject route creates approval_resolved event with metadata.status=rejected", async () => {
    const [approval] = await db
      .insert(approvals)
      .values({
        organizationId: ctx.orgId,
        n8nExecutionId: `exec-events-reject-${Date.now()}`,
        callbackUrl: CALLBACK_URL,
        title: "Aprovação para teste reject event",
        status: "pending",
      })
      .returning()

    const res = await rejectPOST(
      postReq({ comment: "Documentação incompleta" }),
      params(approval.id)
    )
    expect(res.status).toBe(200)

    const events = await db
      .select()
      .from(approvalEvents)
      .where(eq(approvalEvents.approvalId, approval.id))

    expect(events).toHaveLength(1)
    const event = events[0]
    expect(event.eventType).toBe("approval_resolved")
    expect(event.actorType).toBe("user")
    expect(event.actorId).toBe(ctx.userId)
    const metadata = event.metadata as Record<string, unknown>
    expect(metadata.status).toBe("rejected")
    expect(metadata.comment).toBe("Documentação incompleta")
  })

  test("events are scoped to ctx.orgId — cross-tenant JOIN returns nothing for wrong org", async () => {
    const [approval] = await db
      .insert(approvals)
      .values({
        organizationId: ctx.orgId,
        n8nExecutionId: `exec-events-scope-${Date.now()}`,
        callbackUrl: CALLBACK_URL,
        title: "Aprovação para teste de isolamento",
        status: "pending",
      })
      .returning()

    await approvePOST(postReq({ comment: "OK" }), params(approval.id))

    // Correct org — event visible via JOIN
    const eventsInOrg = await db
      .select({ eventId: approvalEvents.id, eventType: approvalEvents.eventType })
      .from(approvalEvents)
      .innerJoin(approvals, eq(approvalEvents.approvalId, approvals.id))
      .where(
        and(
          eq(approvals.organizationId, ctx.orgId),
          eq(approvalEvents.approvalId, approval.id)
        )
      )

    expect(eventsInOrg).toHaveLength(1)
    expect(eventsInOrg[0].eventType).toBe("approval_resolved")

    // Wrong org — JOIN filters it out
    const eventsOtherOrg = await db
      .select({ eventId: approvalEvents.id })
      .from(approvalEvents)
      .innerJoin(approvals, eq(approvalEvents.approvalId, approvals.id))
      .where(
        and(
          eq(approvals.organizationId, "other-org-does-not-exist"),
          eq(approvalEvents.approvalId, approval.id)
        )
      )

    expect(eventsOtherOrg).toHaveLength(0)
  })
})
