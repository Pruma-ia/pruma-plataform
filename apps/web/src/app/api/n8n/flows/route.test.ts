import { describe, it, expect, vi, beforeEach } from "vitest"

const mockVerify = vi.fn()
vi.mock("@/lib/n8n", () => ({ verifyN8nSecret: mockVerify }))

const mockSelectRows = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => ({
            then: (fn: (rows: unknown[]) => unknown) => fn(mockSelectRows()),
          }),
        }),
      }),
    }),
    insert: () => ({ values: mockInsert }),
    update: () => ({ set: () => ({ where: mockUpdate }) }),
  },
}))

vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn() }))
vi.mock("../../../../../db/schema", () => ({
  flows: {},
  flowRuns: {},
  organizations: {},
}))

function makeRequest(body: object) {
  return new Request("http://localhost/api/n8n/flows", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-n8n-secret": "secret" },
    body: JSON.stringify(body),
  })
}

const validPayload = {
  organizationSlug: "acme",
  prumaFlowId: "flow-1",
  name: "Aprovação de NF",
  status: "success",
}

describe("POST /api/n8n/flows", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockResolvedValue([{ id: "run-1" }])
    mockUpdate.mockResolvedValue([])
  })

  it("retorna 401 quando secret inválido", async () => {
    mockVerify.mockReturnValue(false)
    const { POST } = await import("./route")
    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(401)
  })

  it("retorna 400 para payload inválido", async () => {
    mockVerify.mockReturnValue(true)
    mockSelectRows.mockReturnValue([{ id: "org-1" }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ organizationSlug: "acme" })) // faltam campos obrigatórios
    expect(res.status).toBe(400)
  })

  it("retorna 404 quando org não encontrada", async () => {
    mockVerify.mockReturnValue(true)
    mockSelectRows.mockReturnValue([]) // org não encontrada
    const { POST } = await import("./route")
    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(404)
  })

  it("retorna 200 com idempotent=true para executionId duplicado", async () => {
    mockVerify.mockReturnValue(true)
    // Primeira chamada: org encontrada; segunda: dup encontrado
    mockSelectRows
      .mockReturnValueOnce([{ id: "org-1" }]) // org lookup
      .mockReturnValueOnce([{ id: "existing-run" }]) // dup lookup
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ ...validPayload, n8nExecutionId: "exec-abc" }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.idempotent).toBe(true)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it("retorna 200 e cria flowRun para execução nova", async () => {
    mockVerify.mockReturnValue(true)
    mockSelectRows
      .mockReturnValueOnce([{ id: "org-1" }]) // org lookup
      .mockReturnValueOnce([]) // sem dup
      .mockReturnValueOnce([{ id: "existing-flow" }]) // flow existente
    mockInsert.mockResolvedValue([{ id: "run-new" }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ ...validPayload, n8nExecutionId: "exec-new" }))
    expect(res.status).toBe(200)
    expect(mockInsert).toHaveBeenCalled()
  })
})
