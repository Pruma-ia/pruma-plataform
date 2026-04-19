export function verifyN8nSecret(req: Request): boolean {
  const secret = req.headers.get("x-n8n-secret")
  return secret === process.env.N8N_WEBHOOK_SECRET
}
