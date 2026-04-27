import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { verifyN8nSecret, validateCallbackUrl, dispatchCallback } from "./n8n"

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

  it("blocks IPv6 ULA fc prefix (fc00::/7)", () =>
    expect(validateCallbackUrl("https://[fc00::1]/webhook")).toBe(false))

  it("blocks IPv4-mapped IPv6 (::ffff:10.x)", () =>
    expect(validateCallbackUrl("https://[::ffff:10.0.0.1]/webhook")).toBe(false))
})

describe("dispatchCallback", () => {
  const payload = {
    approvalId: "appr-1",
    status: "approved",
    resolvedBy: "user@test.com",
    comment: "ok",
    decisionValues: null,
    resolvedAt: new Date().toISOString(),
    files: [],
  }

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true })
  })

  it("returns 'blocked' when callbackUrl fails SSRF check", async () => {
    const result = await dispatchCallback("https://192.168.1.1/webhook", payload)
    expect(result).toBe("blocked")
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("returns 'sent' when fetch succeeds", async () => {
    const result = await dispatchCallback("https://n8n.example.com/webhook/abc", payload)
    expect(result).toBe("sent")
  })

  it("returns 'failed' when fetch returns ok:false", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false })
    const result = await dispatchCallback("https://n8n.example.com/webhook/abc", payload)
    expect(result).toBe("failed")
  })

  it("returns 'failed' when fetch throws (timeout/network)", async () => {
    global.fetch = vi.fn().mockRejectedValue(new DOMException("signal timed out", "AbortError"))
    const result = await dispatchCallback("https://n8n.example.com/webhook/abc", payload)
    expect(result).toBe("failed")
  })

  it("sends correct JSON body to callbackUrl", async () => {
    await dispatchCallback("https://n8n.example.com/webhook/abc", payload)
    const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe("https://n8n.example.com/webhook/abc")
    expect(JSON.parse(options.body)).toMatchObject({ approvalId: "appr-1", status: "approved" })
  })
})
