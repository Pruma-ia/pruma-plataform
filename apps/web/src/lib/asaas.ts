const ASAAS_API_URL = process.env.ASAAS_API_URL ?? "https://sandbox.asaas.com/api/v3"
const ASAAS_API_KEY = process.env.ASAAS_API_KEY!

async function asaasRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${ASAAS_API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      access_token: ASAAS_API_KEY,
      ...options.headers,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(`Asaas API error ${res.status}: ${JSON.stringify(error)}`)
  }

  return res.json()
}

export interface AsaasCustomer {
  id: string
  name: string
  email: string
  cpfCnpj?: string
}

export interface AsaasSubscription {
  id: string
  customer: string
  billingType: string
  value: number
  nextDueDate: string
  status: string
  cycle: string
}

export const asaas = {
  customers: {
    create: (data: { name: string; email: string; cpfCnpj?: string }) =>
      asaasRequest<AsaasCustomer>("/customers", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    find: (email: string) =>
      asaasRequest<{ data: AsaasCustomer[] }>(`/customers?email=${encodeURIComponent(email)}`),
  },

  subscriptions: {
    create: (data: {
      customer: string
      billingType: "CREDIT_CARD" | "BOLETO" | "PIX"
      value: number
      nextDueDate: string
      cycle: "MONTHLY" | "YEARLY"
      description?: string
      creditCard?: object
      creditCardHolderInfo?: object
      remoteIp?: string
    }) =>
      asaasRequest<AsaasSubscription>("/subscriptions", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    get: (id: string) => asaasRequest<AsaasSubscription>(`/subscriptions/${id}`),

    cancel: (id: string) =>
      asaasRequest(`/subscriptions/${id}`, { method: "DELETE" }),
  },

  paymentLinks: {
    create: (data: {
      name: string
      description?: string
      value: number
      billingType: string
      chargeType: "RECURRENT" | "INSTALLMENT" | "DETACHED"
      subscriptionCycle?: "MONTHLY" | "YEARLY"
      notificationEnabled?: boolean
    }) =>
      asaasRequest<{ id: string; url: string }>("/paymentLinks", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
}
