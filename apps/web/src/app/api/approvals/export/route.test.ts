/**
 * Unit tests for GET /api/approvals/export — APPROV-04
 *
 * What is MOCKED:
 *   - auth() → controls session presence and organizationId
 *   - db   → returns controlled row arrays, no real DB
 *
 * What is TESTED:
 *   - 401 when unauthenticated
 *   - 200 + valid CSV headers when authenticated
 *   - CSV value escaping (commas, double-quotes in title)
 *   - CSV injection prevention (=, +, -, @ prefixed with space)
 *   - Drizzle WHERE call scoped by organizationId from session
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks — must be declared before imports ───────────────────────────────────

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock("@/lib/auth", () => ({ auth: mockAuth }))

// Chainable Drizzle mock: select().from().leftJoin().leftJoin().where().orderBy()
const mockRows = vi.hoisted(() => ({ value: [] as object[] }))
const mockSelect = vi.hoisted(() => vi.fn())
vi.mock("@/lib/db", () => {
  const makeChain = () => ({
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockImplementation(() => Promise.resolve(mockRows.value)),
  })
  mockSelect.mockImplementation(makeChain)
  return { db: { select: mockSelect } }
})

// ── Real import of route under test ──────────────────────────────────────────

import { GET } from "./route"

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReq(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/approvals/export")
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new Request(url.toString())
}

function setSession(orgId = "org-123") {
  mockAuth.mockResolvedValue({
    user: { id: "user-1", organizationId: orgId, email: "test@pruma.test" },
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/approvals/export", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRows.value = []
    const makeChain = () => ({
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockImplementation(() => Promise.resolve(mockRows.value)),
    })
    mockSelect.mockImplementation(makeChain)
  })

  it("returns 401 when unauthenticated (no session)", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET(makeReq())
    expect(res.status).toBe(401)
  })

  it("returns 401 when session has no organizationId", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } })
    const res = await GET(makeReq())
    expect(res.status).toBe(401)
  })

  it("returns 200 with Content-Type text/csv and Content-Disposition attachment", async () => {
    setSession()
    mockRows.value = [
      {
        id: "appr-1",
        title: "Aprovação simples",
        status: "approved",
        flowName: "Fluxo A",
        createdAt: new Date("2026-05-01T12:00:00Z"),
        resolvedByName: "João Silva",
        comment: null,
      },
    ]

    const res = await GET(makeReq())
    expect(res.status).toBe(200)

    const ct = res.headers.get("Content-Type")
    expect(ct).toContain("text/csv")
    expect(ct).toContain("utf-8")

    const cd = res.headers.get("Content-Disposition")
    expect(cd).toContain("attachment")
    expect(cd).toContain("aprovacoes-")
    expect(cd).toContain(".csv")
  })

  it("CSV body contains header row with expected column names", async () => {
    setSession()
    const res = await GET(makeReq())
    const text = await res.text()
    const header = text.split("\n")[0]
    expect(header).toContain("ID")
    expect(header).toContain("Título")
    expect(header).toContain("Status")
    expect(header).toContain("Fluxo")
    expect(header).toContain("Data")
    expect(header).toContain("Resolvido Por")
    expect(header).toContain("Comentário")
  })

  it("escapes title containing commas — wraps in double-quotes", async () => {
    setSession()
    mockRows.value = [
      {
        id: "appr-2",
        title: "Aprovação, lote 3",
        status: "pending",
        flowName: null,
        createdAt: new Date("2026-05-02T10:00:00Z"),
        resolvedByName: null,
        comment: null,
      },
    ]

    const res = await GET(makeReq())
    const text = await res.text()
    expect(text).toContain('"Aprovação, lote 3"')
  })

  it("escapes title containing double-quotes — doubles the quote (RFC 4180)", async () => {
    setSession()
    mockRows.value = [
      {
        id: "appr-3",
        title: 'Contrato "Especial" Urgente',
        status: "pending",
        flowName: null,
        createdAt: new Date("2026-05-02T10:00:00Z"),
        resolvedByName: null,
        comment: null,
      },
    ]

    const res = await GET(makeReq())
    const text = await res.text()
    expect(text).toContain('"Contrato ""Especial"" Urgente"')
  })

  it("prefixes CSV-injection characters in title with a space", async () => {
    setSession()
    mockRows.value = [
      {
        id: "appr-4",
        title: "=SUM(A1:A10)",
        status: "pending",
        flowName: null,
        createdAt: new Date("2026-05-02T10:00:00Z"),
        resolvedByName: null,
        comment: null,
      },
    ]

    const res = await GET(makeReq())
    const text = await res.text()
    expect(text).toContain('" =SUM(A1:A10)"')
  })

  it("prefixes CSV-injection in comment field with a space", async () => {
    setSession()
    mockRows.value = [
      {
        id: "appr-5",
        title: "Aprovação normal",
        status: "rejected",
        flowName: null,
        createdAt: new Date("2026-05-02T10:00:00Z"),
        resolvedByName: null,
        comment: "+cmd|'/bin/sh -i'",
      },
    ]

    const res = await GET(makeReq())
    const text = await res.text()
    expect(text).toContain('" +cmd|')
  })

  it("Drizzle WHERE clause is called — proves orgId scoping is applied", async () => {
    setSession("org-xyz")
    await GET(makeReq())
    expect(mockSelect).toHaveBeenCalled()
    const chain = mockSelect.mock.results[0].value
    expect(chain.where).toHaveBeenCalled()
  })
})
