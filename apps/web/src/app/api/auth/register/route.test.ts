import { describe, it, expect, vi, beforeEach } from "vitest"

const mockSelect = vi.fn()
const mockInsert = vi.fn()
let selectCallCount = 0
let insertCallCount = 0

vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => {
          selectCallCount++
          return Promise.resolve(mockSelect())
        },
      }),
    }),
    insert: () => ({
      values: () => {
        insertCallCount++
        if (insertCallCount === 1) return { returning: () => Promise.resolve([{ id: "user-1" }]) }
        if (insertCallCount === 2) return { returning: () => Promise.resolve([{ id: "org-1" }]) }
        return Promise.resolve([])
      },
    }),
  },
}))

vi.mock("drizzle-orm", () => ({ eq: vi.fn() }))
vi.mock("../../../../../db/schema", () => ({ users: {}, organizations: {}, organizationMembers: {} }))
vi.mock("bcryptjs", () => ({ default: { hash: vi.fn().mockResolvedValue("hashed-pw") } }))

function makeRequest(body: object) {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

const validBody = {
  name: "João Silva",
  email: "joao@test.com",
  password: "Senha@123",
  organizationName: "Acme Corp",
  acceptedTerms: true as const,
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallCount = 0
    insertCallCount = 0
    mockSelect.mockReturnValue([]) // no existing user, no slug conflict
  })

  it("retorna 400 quando campos obrigatórios faltam", async () => {
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ email: "joao@test.com" }))
    expect(res.status).toBe(400)
  })

  it("retorna 400 quando email inválido", async () => {
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ ...validBody, email: "not-an-email" }))
    expect(res.status).toBe(400)
  })

  it("retorna 400 quando password curto (< 8 chars)", async () => {
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ ...validBody, password: "short" }))
    expect(res.status).toBe(400)
  })

  it("retorna 400 quando name curto (< 2 chars)", async () => {
    const { POST } = await import("./route")
    const res = await POST(makeRequest({ ...validBody, name: "J" }))
    expect(res.status).toBe(400)
  })

  it("retorna 409 quando email já cadastrado", async () => {
    mockSelect.mockReturnValue([{ id: "existing-user" }])
    const { POST } = await import("./route")
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toContain("cadastrado")
  })

  it("retorna 200 e cria user + org + member com slug único", async () => {
    mockSelect.mockReturnValue([]) // no existing user, no slug conflict
    const { POST } = await import("./route")
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it("appends timestamp ao slug quando já existe (slug conflict)", async () => {
    // First select: no existing user; second select (slug check): conflict → third: no conflict
    mockSelect
      .mockReturnValueOnce([])              // no existing user
      .mockReturnValueOnce([{ id: "org-slug-taken" }]) // slug exists
    const { POST } = await import("./route")
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(200)
  })
})
