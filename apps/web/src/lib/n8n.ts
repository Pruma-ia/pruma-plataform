import { timingSafeEqual } from "crypto"

export function verifyN8nSecret(req: Request): boolean {
  const secret = req.headers.get("x-n8n-secret")
  const expected = process.env.N8N_WEBHOOK_SECRET
  if (!secret || !expected) return false
  try {
    return timingSafeEqual(Buffer.from(secret), Buffer.from(expected))
  } catch {
    return false
  }
}

export interface N8nCallbackPayload {
  approvalId: string
  status: string
  resolvedBy: string | null
  comment?: string | null
  decisionValues?: Record<string, string> | null
  resolvedAt: string
  files: { r2Key: string; filename: string; mimeType: string; sizeBytes: number }[]
  retried?: boolean
}

export async function dispatchCallback(
  callbackUrl: string,
  payload: N8nCallbackPayload
): Promise<"sent" | "failed" | "blocked"> {
  if (!validateCallbackUrl(callbackUrl)) {
    console.error("[approval] callbackUrl bloqueado por SSRF", { approvalId: payload.approvalId, callbackUrl })
    return "blocked"
  }
  const ok = await fetch(callbackUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(5000),
    body: JSON.stringify(payload),
  })
    .then((r) => r.ok)
    .catch((err) => {
      console.error("[approval] falha no callback n8n", { approvalId: payload.approvalId, error: String(err) })
      return false
    })
  return ok ? "sent" : "failed"
}

// Bloqueia URLs que apontam para redes privadas/internas (SSRF)
const PRIVATE_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^::1$/,
  // ULA fc00::/7 — cobre prefixos fc e fd (IPv6 privado)
  /^\[?f[cd][\da-f]{2}:/i,
  /^169\.254\./,
  /^0\.0\.0\.0$/,
  // IPv4-mapped IPv6 (::ffff:10.x, ::ffff:192.168.x, etc.)
  /^\[?::ffff:/i,
]

export function validateCallbackUrl(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url)
    if (protocol !== "http:" && protocol !== "https:") return false
    return !PRIVATE_PATTERNS.some((p) => p.test(hostname))
  } catch {
    return false
  }
}
