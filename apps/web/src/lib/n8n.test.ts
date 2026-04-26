import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { verifyN8nSecret, validateCallbackUrl } from "./n8n"

function makeRequest(secret: string | null) {
  const headers = new Headers()
  if (secret !== null) headers.set("x-n8n-secret", secret)
  return new Request("http://localhost", { headers })
}

describe("verifyN8nSecret", () => {
  const orig = process.env.N8N_WEBHOOK_SECRET

  beforeEach(() => { process.env.N8N_WEBHOOK_SECRET = "test-secret" })
  afterEach(() => { process.env.N8N_WEBHOOK_SECRET = orig })

  it("returns true for matching secret", () =>
    expect(verifyN8nSecret(makeRequest("test-secret"))).toBe(true))

  it("returns false for wrong secret (same length)", () =>
    expect(verifyN8nSecret(makeRequest("test-XXXXXX"))).toBe(false))

  it("returns false for wrong secret (different length — timingSafeEqual throws)", () =>
    expect(verifyN8nSecret(makeRequest("wrong"))).toBe(false))

  it("returns false when header missing", () =>
    expect(verifyN8nSecret(makeRequest(null))).toBe(false))

  it("returns false when env var not set", () => {
    delete process.env.N8N_WEBHOOK_SECRET
    expect(verifyN8nSecret(makeRequest("test-secret"))).toBe(false)
  })
})

describe("validateCallbackUrl", () => {
  it("accepts public https URL", () =>
    expect(validateCallbackUrl("https://n8n.example.com/webhook/abc")).toBe(true))

  it("accepts public http URL", () =>
    expect(validateCallbackUrl("http://n8n.example.com/webhook")).toBe(true))

  it("blocks localhost", () =>
    expect(validateCallbackUrl("https://localhost/webhook")).toBe(false))

  it("blocks 127.0.0.1", () =>
    expect(validateCallbackUrl("https://127.0.0.1/webhook")).toBe(false))

  it("blocks 10.x.x.x", () =>
    expect(validateCallbackUrl("https://10.0.0.1/webhook")).toBe(false))

  it("blocks 192.168.x.x", () =>
    expect(validateCallbackUrl("https://192.168.1.1/webhook")).toBe(false))

  it("blocks 172.16-31.x.x", () =>
    expect(validateCallbackUrl("https://172.16.0.1/webhook")).toBe(false))

  it("blocks 169.254.x.x (link-local / IMDS)", () =>
    expect(validateCallbackUrl("https://169.254.169.254/webhook")).toBe(false))

  it("blocks 0.0.0.0", () =>
    expect(validateCallbackUrl("https://0.0.0.0/webhook")).toBe(false))

  it("rejects non-http protocol", () =>
    expect(validateCallbackUrl("ftp://example.com/webhook")).toBe(false))

  it("rejects invalid URL", () =>
    expect(validateCallbackUrl("not-a-url")).toBe(false))
})
