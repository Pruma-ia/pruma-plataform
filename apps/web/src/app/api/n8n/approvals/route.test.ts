import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockVerify = vi.fn()
const mockValidateCallback = vi.fn()
vi.mock("@/lib/n8n", () => ({
  verifyN8nSecret: mockVerify,
  validateCallbackUrl: mockValidateCallback,
}))

// DB mock with configurable chain responses
const mockOrgRows = vi.fn()
const mockFlowRows = vi.fn()
const mockUploadRows = vi.fn()
const mockInsertApproval = vi.fn()
const mockInsertFiles = vi.fn()
const mockUpdateUploads = vi.fn()

let selectCallCount = 0
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
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
    insert: (table: unknown) => ({
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

vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), inArray: vi.fn() }))
vi.mock("../../../../../db/schema", () => ({
  approvals: {},
  approvalFiles: {},
  approvalFileUploads: {},
  flows: {},
  organizations: {},
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
    mockInsertApproval.mockResolvedValue([{ id: "appr-1" }])
    mockUpdateUploads.mockResolvedValue([])
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
    mockInsertApproval.mockResolvedValue([{ id: "appr-1" }])
    mockUpdateUploads.mockResolvedValue([])
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
})
