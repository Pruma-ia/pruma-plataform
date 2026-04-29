import "dotenv/config"

const ASAAS_API_URL = process.env.ASAAS_API_URL ?? "https://sandbox.asaas.com/api/v3"
const ASAAS_API_KEY = process.env.ASAAS_API_KEY
const ASAAS_WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN
const WEBHOOK_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/asaas`
  : process.argv[2]

if (!ASAAS_API_KEY) {
  console.error("ASAAS_API_KEY not set")
  process.exit(1)
}
if (!ASAAS_WEBHOOK_TOKEN) {
  console.error("ASAAS_WEBHOOK_TOKEN not set")
  process.exit(1)
}
if (!WEBHOOK_URL) {
  console.error("Pass webhook URL as argument: npx tsx scripts/register-asaas-webhook.ts https://yourdomain.com/api/webhooks/asaas")
  process.exit(1)
}

async function main() {
  console.log(`Registering webhook → ${WEBHOOK_URL}`)
  console.log(`Asaas API → ${ASAAS_API_URL}`)

  const res = await fetch(`${ASAAS_API_URL}/webhooks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      access_token: ASAAS_API_KEY!,
    },
    body: JSON.stringify({
      url: WEBHOOK_URL,
      email: "kelly.lima@w1business.com.br",
      apiVersion: 3,
      enabled: true,
      interrupted: false,
      authToken: ASAAS_WEBHOOK_TOKEN,
      events: [
        "PAYMENT_CONFIRMED",
        "PAYMENT_RECEIVED",
        "PAYMENT_OVERDUE",
        "PAYMENT_DELETED",
        "SUBSCRIPTION_DELETED",
      ],
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    console.error("Failed:", JSON.stringify(data, null, 2))
    process.exit(1)
  }

  console.log("Webhook registered:", JSON.stringify(data, null, 2))
}

main()
