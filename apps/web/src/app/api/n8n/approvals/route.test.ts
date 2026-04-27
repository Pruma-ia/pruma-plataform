import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockVerify = vi.fn()
const mockValidateCallback = vi.fn()
vi.mock("@/lib/n8n", () => ({
  verifyN8nSecret: mockVerify,
  validateCallbackUrl: mockValidateCallback,
}))

const mockSendApprovalNotificationEmail = vi.fn().mockResolvedValue(undefined)
vi.mock("@/lib/email", () => ({
  sendApprovalNotificationEmail: mockSendApprovalNotificationEmail,
}))

// DB mock with configurable chain responses
const mockOrgRows = vi.fn()
const mockFlowRows = vi.fn()
const mockUploadRows = vi.fn()
const mockMemberRows = vi.fn()
const mockInsertApproval = vi.fn()
const mockInsertFiles = vi.fn()
const mockUpdateUploads = vi.fn()

let selectCallCount = 0
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        // innerJoin path — used for members query
        innerJoin: () => ({
          where: () => Promise.resolve(mockMemberRows()),
        }),
        where: () => ({
          limit: () => ({
            then: (fn: (rows: unknown[]) => unknown) => {
              // First call = org lookup, second = flow lookup
              selectCallCount++
              if (selectCallCount === 1) return fn(mockOrgRows())
              if (selectCallCount === 2) return fn(mockFlowRows())
              return fn([])
            },
          }),
          // For inArray queries (upload validation) - no limit
          then: (fn: (rows: unknown[]) => unknown) => fn(mockUploadRows()),
        }),
      }),
    }),
    insert: (_table: unknown) => ({
      values: (vals: unknown) => {
        // Distinguish approval insert (returns) from files insert (no returning)
        if (Array.isArray(vals)) {
          mockInsertFiles(vals)
          return Promise.resolve([])
        }
        return { returning: () => mockInsertApproval(vals) }
      },
    }),
    update: () => ({
      set: () => ({
        where: mockUpdateUploads,
      }),
    }),
  },
}))

vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), inArray: vi.fn(), isNotNull: vi.fn() }))
vi.mock("../../../../../db/schema", () => ({
  approvals: {},
  approvalFiles: {},
  approvalFileUploads: {},
  flows: {},
  organizations: {},
  organizationMembers: {},
  users: {},
}))

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(body: object) {
  return new Request("http://localhost/api/n8n/approvals", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-n8n-secret": "secret" },
    body: JSON.stringify(body),
  })
}

const validPayload = {
  organizationSlug: "acme",
  n8nExecutionId: "exec-1",
  callbackUrl: "https://n8n.acme.com/webhook/abc",
  title: "Aprovação de NF",
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/n8n/approvals — validação de schema", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallCount = 0
    mockVerify.mockReturnValue(true)
    mockValidateCallback.mockReturnValue(true)
    mockOrgRows.mockReturnValue([{ id: "org-1", n8nBaseUrl: null }])
    mockFlowRows.mockReturnValue([])
    mockUploadRows.mockReturnValue([])
    mockMemberRows.mockResolvedValue([])
    mockInsertApproval.mockResolvedValue([{ id: "appr-1" }])
    mockUpdateUploads.mockResolvedValue([])
    mockSendApprovalNotificationEmail.mockResolvedValue(undefined)
  })

  it("retorna 401 quando secret inválido", async () => {
    mockVerify.mockReturnValue(false)
    const { POST } = await import("./route")
    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(401)
  })

  it("retorna 400 quando n8nExecutionId ausente", async () => {
    const { POST } = await import("./route")
    const { n8nExecutionId: _, ...noExec } = validPayload
    const res = await POST(makeRequest(noExec))
    expect(res.status).toBe(400)
  })

  it("retorna 400 quando callbackUrl não é URL válida", async () => {
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ ...validPayload, callbackUrl: "not-a-url" }))
    expect(res.status).toBe(400)
  })

  it("retorna 404 quando org não encontrada", async () => {
    mockOrgRows.mockReturnValue([])
    const { POST } = await import("./route")
    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(404)
  })

  it("retorna 422 quando callbackUrl aponta para rede privada", async () => {
    mockValidateCallback.mockReturnValue(false)
    const { POST } = await import("./route")
    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(422)
  })

  it("retorna 422 quando callbackUrl não pertence ao domínio n8n registrado na org", async () => {
    mockOrgRows.mockReturnValue([{ id: "org-1", n8nBaseUrl: "https://n8n.acme.com" }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest({
      ...validPayload,
      callbackUrl: "https://n8n.other-company.com/webhook/abc",
    }))
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toContain("n8n.acme.com")
  })

  it("aceita callbackUrl quando domínio corresponde ao n8nBaseUrl da org", async () => {
    mockOrgRows.mockReturnValue([{ id: "org-1", n8nBaseUrl: "https://n8n.acme.com" }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest({
      ...validPayload,
      callbackUrl: "https://n8n.acme.com/webhook/abc",
    }))
    expect(res.status).toBe(200)
  })

  it("retorna 409 quando n8nExecutionId duplicado (idempotência)", async () => {
    mockOrgRows.mockReturnValue([{ id: "org-1", n8nBaseUrl: null }])
    mockInsertApproval.mockRejectedValue(Object.assign(new Error("unique violation"), { code: "23505" }))
    const { POST } = await import("./route")
    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toContain("execution ID")
  })
})

describe("POST /api/n8n/approvals — decisionFields", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallCount = 0
    mockVerify.mockReturnValue(true)
    mockValidateCallback.mockReturnValue(true)
    mockOrgRows.mockReturnValue([{ id: "org-1", n8nBaseUrl: null }])
    mockFlowRows.mockReturnValue([])
    mockUploadRows.mockReturnValue([])
    mockMemberRows.mockResolvedValue([])
    mockInsertApproval.mockResolvedValue([{ id: "appr-1" }])
    mockUpdateUploads.mockResolvedValue([])
    mockSendApprovalNotificationEmail.mockResolvedValue(undefined)
  })

  it("retorna 400 se decisionField não tem options", async () => {
    const { POST } = await import("./route")
    const res = await POST(makeRequest({
      ...validPayload,
      decisionFields: [{ id: "f1", type: "select", label: "Responsável", options: [] }],
    }))
    expect(res.status).toBe(400)
  })

  it("retorna 400 se decisionField tem type inválido", async () => {
    const { POST } = await import("./route")
    const res = await POST(makeRequest({
      ...validPayload,
      decisionFields: [{ id: "f1", type: "text", label: "Responsável", options: [] }],
    }))
    expect(res.status).toBe(400)
  })

  it("aceita decisionFields válido com options id+label", async () => {
    const { POST } = await import("./route")
    const res = await POST(makeRequest({
      ...validPayload,
      decisionFields: [{
        id: "advogado",
        type: "select",
        label: "Advogado responsável",
        options: [
          { id: "adv-1", label: "João Silva" },
          { id: "adv-2", label: "Maria Santos" },
        ],
      }],
    }))
    expect(res.status).toBe(200)
  })
})

describe("POST /api/n8n/approvals — validação de files (r2Keys)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallCount = 0
    mockVerify.mockReturnValue(true)
    mockValidateCallback.mockReturnValue(true)
    mockOrgRows.mockReturnValue([{ id: "org-1", n8nBaseUrl: null }])
    mockFlowRows.mockReturnValue([])
    mockInsertApproval.mockResolvedValue([{ id: "appr-1" }])
    mockUpdateUploads.mockResolvedValue([])
    mockInsertFiles.mockResolvedValue([])
  })

  it("retorna 422 quando r2Key não existe no banco (não pertence à org)", async () => {
    mockUploadRows.mockReturnValue([]) // nenhum upload pendente válido
    const { POST } = await import("./route")
    const res = await POST(makeRequest({
      ...validPayload,
      files: [{
        r2Key: "org-1/uuid-fake/doc.pdf",
        filename: "doc.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
      }],
    }))
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.invalid).toContain("org-1/uuid-fake/doc.pdf")
  })

  it("retorna 200 quando r2Key é válida e pertence à org", async () => {
    mockUploadRows.mockReturnValue([{ r2Key: "org-1/uuid-ok/doc.pdf" }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest({
      ...validPayload,
      files: [{
        r2Key: "org-1/uuid-ok/doc.pdf",
        filename: "doc.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
      }],
    }))
    expect(res.status).toBe(200)
  })

  it("retorna 200 sem files (campo opcional)", async () => {
    const { POST } = await import("./route")
    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(200)
  })

  it("resolve flowId quando prumaFlowId fornecido e flow encontrado", async () => {
    selectCallCount = 0
    mockOrgRows.mockReturnValue([{ id: "org-1", n8nBaseUrl: null }])
    mockFlowRows.mockReturnValue([{ id: "flow-abc" }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ ...validPayload, prumaFlowId: "my-flow" }))
    expect(res.status).toBe(200)
  })

  it("não resolve flowId quando prumaFlowId não fornecido", async () => {
    selectCallCount = 0
    mockOrgRows.mockReturnValue([{ id: "org-1", n8nBaseUrl: null }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(200)
  })

  it("passa expiresAt quando fornecido (cobre branch ternário line 132)", async () => {
    selectCallCount = 0
    mockOrgRows.mockReturnValue([{ id: "org-1", n8nBaseUrl: null }])
    mockInsertApproval.mockResolvedValue([{ id: "appr-expires" }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ ...validPayload, expiresAt: "2026-12-31T23:59:59Z" }))
    expect(res.status).toBe(200)
  })

  it("re-lança erro de insert que não seja constraint 23505", async () => {
    selectCallCount = 0
    mockOrgRows.mockReturnValue([{ id: "org-1", n8nBaseUrl: null }])
    mockInsertApproval.mockRejectedValue(new Error("connection timeout"))
    const { POST } = await import("./route")
    await expect(POST(makeRequest(validPayload))).rejects.toThrow("connection timeout")
  })

  it("retorna 422 quando r2Key tem status 'confirmed' (já consumido por outra aprovação)", async () => {
    // Query filtra status='pending' — r2Key confirmado não retorna na consulta
    mockUploadRows.mockReturnValue([]) // confirmed key ausente no resultado (filtrado pelo SQL)
    const { POST } = await import("./route")
    const res = await POST(makeRequest({
      ...validPayload,
      files: [{
        r2Key: "org-1/uuid-already-used/doc.pdf",
        filename: "doc.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
      }],
    }))
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.invalid).toContain("org-1/uuid-already-used/doc.pdf")
  })
})

describe("POST /api/n8n/approvals — notificação por email", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallCount = 0
    mockVerify.mockReturnValue(true)
    mockValidateCallback.mockReturnValue(true)
    mockOrgRows.mockReturnValue([{ id: "org-1", n8nBaseUrl: null }])
    mockFlowRows.mockReturnValue([])
    mockUploadRows.mockReturnValue([])
    mockMemberRows.mockResolvedValue([])
    mockInsertApproval.mockResolvedValue([{ id: "appr-1" }])
    mockUpdateUploads.mockResolvedValue([])
    mockSendApprovalNotificationEmail.mockResolvedValue(undefined)
  })

  it("dispara email para cada membro verificado após aprovação criada", async () => {
    mockMemberRows.mockResolvedValue([
      { email: "alice@acme.com", name: "Alice" },
      { email: "bob@acme.com", name: "Bob" },
    ])
    const { POST } = await import("./route")
    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(200)
    // Fire-and-forget — aguarda microtask flush
    await Promise.resolve()
    expect(mockSendApprovalNotificationEmail).toHaveBeenCalledTimes(2)
    expect(mockSendApprovalNotificationEmail).toHaveBeenCalledWith(
      { email: "alice@acme.com", name: "Alice" },
      expect.objectContaining({ approvalId: "appr-1", title: "Aprovação de NF", description: undefined })
    )
  })

  it("não dispara email quando não há membros com email verificado", async () => {
    mockMemberRows.mockResolvedValue([])
    const { POST } = await import("./route")
    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(200)
    await Promise.resolve()
    expect(mockSendApprovalNotificationEmail).not.toHaveBeenCalled()
  })

  it("retorna 200 mesmo quando envio de email falha (fire-and-forget)", async () => {
    mockMemberRows.mockResolvedValue([{ email: "alice@acme.com", name: "Alice" }])
    mockSendApprovalNotificationEmail.mockRejectedValue(new Error("Resend timeout"))
    const { POST } = await import("./route")
    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(200)
  })

  it("inclui flowName no payload do email quando prumaFlowId resolvido", async () => {
    selectCallCount = 0
    mockOrgRows.mockReturnValue([{ id: "org-1", n8nBaseUrl: null }])
    mockFlowRows.mockReturnValue([{ id: "flow-abc", name: "Aprovação de Contratos" }])
    mockMemberRows.mockResolvedValue([{ email: "alice@acme.com", name: "Alice" }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ ...validPayload, prumaFlowId: "my-flow" }))
    expect(res.status).toBe(200)
    await Promise.resolve()
    expect(mockSendApprovalNotificationEmail).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ flowName: "Aprovação de Contratos" })
    )
  })

  it("inclui description no payload do email quando fornecida", async () => {
    mockMemberRows.mockResolvedValue([{ email: "alice@acme.com", name: "Alice" }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ ...validPayload, description: "NF referente a serviços de limpeza." }))
    expect(res.status).toBe(200)
    await Promise.resolve()
    expect(mockSendApprovalNotificationEmail).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ description: "NF referente a serviços de limpeza." })
    )
  })

  it("inclui filenames no payload do email quando há arquivos", async () => {
    mockMemberRows.mockResolvedValue([{ email: "alice@acme.com", name: "Alice" }])
    mockUploadRows.mockReturnValue([
      { r2Key: "org-1/uuid-1/contrato.pdf" },
      { r2Key: "org-1/uuid-2/proposta.docx" },
    ])
    mockInsertApproval.mockResolvedValue([{ id: "appr-files" }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest({
      ...validPayload,
      files: [
        { r2Key: "org-1/uuid-1/contrato.pdf", filename: "contrato.pdf", mimeType: "application/pdf", sizeBytes: 1024 },
        { r2Key: "org-1/uuid-2/proposta.docx", filename: "proposta.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", sizeBytes: 2048 },
      ],
    }))
    expect(res.status).toBe(200)
    await Promise.resolve()
    expect(mockSendApprovalNotificationEmail).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ filenames: ["contrato.pdf", "proposta.docx"] })
    )
  })
})
