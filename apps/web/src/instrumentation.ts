export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return

  const required = [
    "ASAAS_API_KEY",
    "ASAAS_WEBHOOK_TOKEN",
    "MAINTENANCE_SECRET",
    "AUTH_SECRET",
  ]
  const missing = required.filter((k) => !process.env[k])
  if (missing.length > 0) {
    console.error(
      `[startup] Missing required env vars: ${missing.join(", ")}. ` +
        "Set them in .env.local (dev) or Vercel environment variables (prod).",
    )
  }

  if (process.env.NEXT_PUBLIC_APP_URL && process.env.ASAAS_API_KEY && process.env.ASAAS_WEBHOOK_TOKEN) {
    const { asaas } = await import("@/lib/asaas")
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/asaas`

    try {
      const { data: existing } = await asaas.webhooks.list() as { data: Array<{ url: string }> }
      if (!existing.some((w) => w.url === webhookUrl)) {
        await asaas.webhooks.register({
          url: webhookUrl,
          email: process.env.ASAAS_WEBHOOK_EMAIL ?? "kelly.lima@w1business.com.br",
          authToken: process.env.ASAAS_WEBHOOK_TOKEN!,
        })
        console.log("[asaas] webhook registered →", webhookUrl)
      }
    } catch (err) {
      console.error("[asaas] webhook registration failed:", err)
    }
  }
}
