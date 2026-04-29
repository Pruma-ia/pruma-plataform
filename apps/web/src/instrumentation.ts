export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
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
  }
}
