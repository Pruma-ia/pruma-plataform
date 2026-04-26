/**
 * Integration tests for the rich approval flow.
 *
 * What is REAL here:
 *   - PostgreSQL queries (real Drizzle ORM against local Docker DB)
 *   - Zod schema validation in every route
 *   - FK constraints, cascade behaviour
 *   - Business logic: r2Key ownership check, SSRF guard, 409 idempotency
 *
 * What is MOCKED:
 *   - auth() → injects test session (NextAuth can't run in test context)
 *   - presignUploadUrl/presignReadUrl → avoids MinIO dependency
 *   - global.fetch → callback URL doesn't actually exist
 */

import { describe, it, expect, vi, beforeAll } from "vitest"

// ── Mocks (vi.mock is hoisted — must be before real imports) ──────────────────

// vi.hoisted ensures mockAuth is initialized before the factory runs
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
import { approvals, approvalFiles, approvalFileUploads } from "../../db/schema"
import { eq } from "drizzle-orm"
import { ctx } from "./state"

// Route handlers — real logic, real DB, mocked auth + r2
import { POST as presignPOST } from "@/app/api/n8n/approvals/files/presign/route"
import { POST as approvalsPOST } from "@/app/api/n8n/approvals/route"
import { GET as filesGET } from "@/app/api/approvals/[id]/files/route"
import { POST as approvePOST } from "@/app/api/approvals/[id]/approve/route"
import { POST as rejectPOST } from "@/app/api/approvals/[id]/reject/route"

// ── Helpers ───────────────────────────────────────────────────────────────────

const N8N_SECRET = "int-test-secret-pruma"

// callbackUrl uses a non-private hostname → passes validateCallbackUrl without mocking it
const CALLBACK_URL = "https://n8n.callback.test/webhook/abc"

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

function getReq() {
  return new Request("http://localhost/api")
}

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

function setSession() {
  mockAuth.mockResolvedValue({
    user: { id: ctx.userId, email: "tester@int.pruma", organizationId: ctx.orgId },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// FLOW 1: presign → create approval → GET files → approve → 409 on retry
// ─────────────────────────────────────────────────────────────────────────────

describe("Full rich approval flow", () => {
  let r2Key: string
  let approvalId: string
  const execId = `exec-flow-${Date.now()}`

  beforeAll(() => {
    setSession()
    global.fetch = vi.fn().mockResolvedValue({ ok: true })
  })

  it("step 1 — presign: retorna uploadUrl + r2Key e cria registro pending no DB", async () => {
    const res = await presignPOST(n8nReq({
      organizationSlug: ctx.n8nSlug,
      filename: "contrato.pdf",
      mimeType: "application/pdf",
      sizeBytes: 50_000,
    }))
    expect(res.status).toBe(200)
    const body = await res.json()

    r2Key = body.r2Key
    expect(body.uploadUrl).toBe("https://minio.test/upload/presigned")
    expect(r2Key).toMatch(new RegExp(`^${ctx.orgId}/`))
    expect(body.expiresAt).toBeDefined()

    // DB: upload pendente criado com orgId correto
    const [upload] = await db
      .select()
      .from(approvalFileUploads)
      .where(eq(approvalFileUploads.r2Key, r2Key))
    expect(upload.status).toBe("pending")
    expect(upload.organizationId).toBe(ctx.orgId)
    expect(upload.filename).toBe("contrato.pdf")

    if (process.env.KEEP_DATA === "1") {
      console.log(`\n[step 1] Upload pendente criado — r2Key: ${r2Key}`)
    }
  })

  it("step 2 — criar aprovação com arquivo e decisionFields salva tudo no DB", async () => {
    const res = await approvalsPOST(n8nReq({
      organizationSlug: ctx.n8nSlug,
      n8nExecutionId: execId,
      callbackUrl: CALLBACK_URL,
      title: "Aprovação de Contrato",
      description: "Requer revisão jurídica",
      decisionFields: [{
        id: "advogado",
        type: "select",
        label: "Advogado responsável",
        options: [
          { id: "adv-1", label: "João Silva" },
          { id: "adv-2", label: "Maria Santos" },
        ],
      }],
      files: [{ r2Key, filename: "contrato.pdf", mimeType: "application/pdf", sizeBytes: 50_000 }],
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    approvalId = body.approvalId
    expect(approvalId).toBeDefined()

    // DB: aprovação criada
    const [appr] = await db.select().from(approvals).where(eq(approvals.id, approvalId))
    expect(appr.status).toBe("pending")
    expect(appr.organizationId).toBe(ctx.orgId)
    expect(appr.n8nExecutionId).toBe(execId)

    // DB: arquivo vinculado à aprovação
    const files = await db.select().from(approvalFiles).where(eq(approvalFiles.approvalId, approvalId))
    expect(files).toHaveLength(1)
    expect(files[0].r2Key).toBe(r2Key)
    expect(files[0].organizationId).toBe(ctx.orgId)

    // DB: upload marcado como confirmed (não mais pendente)
    const [upload] = await db
      .select()
      .from(approvalFileUploads)
      .where(eq(approvalFileUploads.r2Key, r2Key))
    expect(upload.status).toBe("confirmed")

    if (process.env.KEEP_DATA === "1") {
      console.log(`[step 2] Aprovação criada — status: pending`)
      console.log(`         → http://localhost:3000/approvals/${approvalId}`)
      console.log(`         (abra agora pra ver estado pendente antes do próximo step)`)
    }
  })

  it("step 3 — GET arquivos retorna signed URLs sem vazar r2Key", async () => {
    const res = await filesGET(getReq(), params(approvalId))
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.files).toHaveLength(1)
    expect(body.files[0].filename).toBe("contrato.pdf")
    expect(body.files[0].mimeType).toBe("application/pdf")
    expect(body.files[0].sizeBytes).toBe(50_000)
    expect(body.files[0].url).toBe("https://minio.test/read/presigned")
    // r2Key nunca deve vazar na resposta
    expect(body.files[0].r2Key).toBeUndefined()
  })

  it("step 3b — GET arquivos de aprovação de outra org retorna 404", async () => {
    // Inject session for a different org
    mockAuth.mockResolvedValueOnce({
      user: { id: "other-user", email: "other@int.pruma", organizationId: "other-org-id" },
    })
    const res = await filesGET(getReq(), params(approvalId))
    expect(res.status).toBe(404)
    // Restore correct session
    setSession()
  })

  it("step 4 — aprovar com decisionValues: DB atualizado + callback disparado com payload correto", async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockClear()

    const res = await approvePOST(
      postReq({ comment: "Contrato aprovado após revisão", decisionValues: { advogado: "adv-1" } }),
      params(approvalId),
    )
    expect(res.status).toBe(200)

    // DB: status, resolvedBy, resolvedAt, comment, decisionValues
    const [appr] = await db.select().from(approvals).where(eq(approvals.id, approvalId))
    expect(appr.status).toBe("approved")
    expect(appr.resolvedBy).toBe(ctx.userId)
    expect(appr.resolvedAt).not.toBeNull()
    expect(appr.comment).toBe("Contrato aprovado após revisão")
    expect(appr.decisionValues).toEqual({ advogado: "adv-1" })

    // Callback: disparado uma vez para a URL correta com payload completo
    expect(global.fetch).toHaveBeenCalledOnce()
    const [callUrl, callOpts] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(callUrl).toBe(CALLBACK_URL)
    const callBody = JSON.parse(callOpts.body)
    expect(callBody.status).toBe("approved")
    expect(callBody.decisionValues).toEqual({ advogado: "adv-1" })
    expect(callBody.comment).toBe("Contrato aprovado após revisão")
    expect(callBody.approvalId).toBe(approvalId)
    expect(callBody.resolvedAt).toBeDefined()

    if (process.env.KEEP_DATA === "1") {
      console.log(`[step 4] Aprovação resolvida — status: approved`)
      console.log(`         → http://localhost:3000/approvals/${approvalId}`)
    }
  })

  it("step 5 — segunda tentativa de aprovar retorna 409", async () => {
    const res = await approvePOST(postReq({ comment: "again" }), params(approvalId))
    expect(res.status).toBe(409)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// FLOW 2: rejeição com decisionValues
// ─────────────────────────────────────────────────────────────────────────────

describe("Rejeição com decisionValues", () => {
  let rejectApprovalId: string

  beforeAll(async () => {
    setSession()
    global.fetch = vi.fn().mockResolvedValue({ ok: true })

    const [appr] = await db
      .insert(approvals)
      .values({
        organizationId: ctx.orgId,
        n8nExecutionId: `exec-reject-${Date.now()}`,
        callbackUrl: "https://n8n.callback.test/webhook/reject",
        title: "Aprovação para Rejeição",
        status: "pending",
      })
      .returning()
    rejectApprovalId = appr.id
  }, 10_000)

  it("rejeitar salva decisionValues no DB e dispara callback com status rejected", async () => {
    const res = await rejectPOST(
      postReq({ comment: "Documentação incompleta", decisionValues: { advogado: "adv-2" } }),
      params(rejectApprovalId),
    )
    expect(res.status).toBe(200)

    const [appr] = await db.select().from(approvals).where(eq(approvals.id, rejectApprovalId))
    expect(appr.status).toBe("rejected")
    expect(appr.resolvedBy).toBe(ctx.userId)
    expect(appr.comment).toBe("Documentação incompleta")
    expect(appr.decisionValues).toEqual({ advogado: "adv-2" })

    expect(global.fetch).toHaveBeenCalledOnce()
    const callBody = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
    expect(callBody.status).toBe("rejected")
    expect(callBody.comment).toBe("Documentação incompleta")
    expect(callBody.decisionValues).toEqual({ advogado: "adv-2" })
  })

  it("rejeição sem comment retorna 422", async () => {
    const [appr] = await db
      .insert(approvals)
      .values({ organizationId: ctx.orgId, title: "Sem comment", status: "pending" })
      .returning()

    const res = await rejectPOST(postReq({ comment: "" }), params(appr.id))
    expect(res.status).toBe(422)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY: r2Key cross-org injection
// ─────────────────────────────────────────────────────────────────────────────

describe("Security — r2Key pertencente a outra org é rejeitada", () => {
  it("r2Key inexistente no banco retorna 422 com lista de inválidas", async () => {
    const fakeKey = "other-org-id/uuid-fake/malicious.pdf"
    const res = await approvalsPOST(n8nReq({
      organizationSlug: ctx.n8nSlug,
      n8nExecutionId: `exec-sec-${Date.now()}`,
      callbackUrl: "https://n8n.callback.test/webhook/sec",
      title: "Tentativa de injeção cross-org",
      files: [{ r2Key: fakeKey, filename: "malicious.pdf", mimeType: "application/pdf", sizeBytes: 100 }],
    }))
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.invalid).toContain(fakeKey)
  })

  it("r2Key confirmed (já vinculada a outra aprovação) retorna 422", async () => {
    // Create a presign record but mark it confirmed (simulates already-used key)
    const usedKey = `${ctx.orgId}/${crypto.randomUUID()}/doc.pdf`
    await db.insert(approvalFileUploads).values({
      organizationId: ctx.orgId,
      r2Key: usedKey,
      filename: "doc.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1000,
      status: "confirmed", // not "pending" → invalid for new approval
      expiresAt: new Date(Date.now() + 60_000),
    })

    const res = await approvalsPOST(n8nReq({
      organizationSlug: ctx.n8nSlug,
      n8nExecutionId: `exec-used-${Date.now()}`,
      callbackUrl: "https://n8n.callback.test/webhook/used",
      title: "Tentativa de reusar key confirmada",
      files: [{ r2Key: usedKey, filename: "doc.pdf", mimeType: "application/pdf", sizeBytes: 1000 }],
    }))
    expect(res.status).toBe(422)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION: presign endpoint guards
// ─────────────────────────────────────────────────────────────────────────────

describe("Presign — validações de mimeType e sizeBytes", () => {
  it("mimeType não permitido (video/mp4) retorna 422", async () => {
    const res = await presignPOST(n8nReq({
      organizationSlug: ctx.n8nSlug,
      filename: "video.mp4",
      mimeType: "video/mp4",
      sizeBytes: 1_000_000,
    }))
    expect(res.status).toBe(422)
  })

  it("sizeBytes acima de 10MB retorna 400", async () => {
    const res = await presignPOST(n8nReq({
      organizationSlug: ctx.n8nSlug,
      filename: "huge.pdf",
      mimeType: "application/pdf",
      sizeBytes: 11 * 1024 * 1024,
    }))
    expect(res.status).toBe(400)
  })

  it("org inexistente retorna 404", async () => {
    const res = await presignPOST(n8nReq({
      organizationSlug: "org-que-nao-existe",
      filename: "doc.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1000,
    }))
    expect(res.status).toBe(404)
  })
})
