import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET, PATCH } from "./route"

const mockAuth = vi.hoisted(() => vi.fn())
const mockSelect = vi.hoisted(() => vi.fn())
const mockUpdate = vi.hoisted(() => vi.fn())

vi.mock("@/lib/auth", () => ({ auth: mockAuth }))

vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: mockSelect }) }),
    update: () => ({ set: () => ({ where: mockUpdate }) }),
  },
}))

const ORG_ID = "org-1"
const USER_ID = "user-1"

const session = {
  user: { id: USER_ID, organizationId: ORG_ID, role: "owner" },
}

const orgData = {
  name: "Acme",
  cnpj: null,
  phone: null,
  addressStreet: null,
  addressNumber: null,
  addressComplement: null,
  addressZipCode: null,
  addressCity: null,
  addressState: null,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("GET /api/user/org-profile", () => {
  it("returns 401 without session", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it("returns org profile data", async () => {
    mockAuth.mockResolvedValue(session)
    mockSelect.mockResolvedValue([orgData])
    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.name).toBe("Acme")
  })

  it("returns 404 if org not found", async () => {
    mockAuth.mockResolvedValue(session)
    mockSelect.mockResolvedValue([])
    const res = await GET()
    expect(res.status).toBe(404)
  })
})

describe("PATCH /api/user/org-profile", () => {
  it("returns 401 without session", async () => {
    mockAuth.mockResolvedValue(null)
    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({}),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(401)
  })

  it("returns 403 for member role", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID, organizationId: ORG_ID } })
    mockSelect.mockResolvedValue([{ role: "member" }])
    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ cnpj: "12345678000195" }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(403)
  })

  it("returns 400 for invalid CNPJ format", async () => {
    mockAuth.mockResolvedValue(session)
    mockSelect.mockResolvedValue([{ role: "owner" }])
    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ cnpj: "123" }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })

  it("returns 400 for invalid CEP", async () => {
    mockAuth.mockResolvedValue(session)
    mockSelect.mockResolvedValue([{ role: "owner" }])
    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ addressZipCode: "1234" }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })

  it("updates org profile for owner", async () => {
    mockAuth.mockResolvedValue(session)
    mockSelect.mockResolvedValue([{ role: "owner" }])
    mockUpdate.mockResolvedValue([])
    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({
        cnpj: "12345678000195",
        phone: "11999990000",
        addressZipCode: "01310100",
        addressStreet: "Av Paulista",
        addressNumber: "1000",
        addressCity: "São Paulo",
        addressState: "SP",
      }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
  })

  it("returns 400 when required fields are missing", async () => {
    mockAuth.mockResolvedValue(session)
    mockSelect.mockResolvedValue([{ role: "owner" }])
    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ cnpj: "12345678000195" }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })
})
