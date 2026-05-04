const ASAAS_API_URL = process.env.ASAAS_API_URL ?? "https://sandbox.asaas.com/api/v3"
const ASAAS_API_KEY = process.env.ASAAS_API_KEY!

// ── Cadastral sync helper (ORG-04) ────────────────────────────────────────────

export interface OrgCadastralData {
  cnpj: string
  phone: string | null
  addressStreet: string | null
  addressNumber: string | null
  addressComplement: string | null
  addressZipCode: string | null
  addressCity: string | null
  addressState: string | null
}

/**
 * PUTs cadastral data to the Asaas customer record.
 * Called at onboarding/cadastral form submit — sync failure is logged but NEVER blocks completion.
 * Returns { ok: true } on 2xx, { ok: false, error } otherwise. Never throws.
 */
export async function updateAsaasCustomer(
  asaasCustomerId: string,
  data: OrgCadastralData,
): Promise<{ ok: boolean; error?: string }> {
  if (!ASAAS_API_KEY) {
    return { ok: false, error: "ASAAS_API_KEY not configured" }
  }
  try {
    const res = await fetch(`${ASAAS_API_URL}/customers/${asaasCustomerId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        access_token: ASAAS_API_KEY,
      },
      body: JSON.stringify({
        cpfCnpj: data.cnpj,
        phone: data.phone ?? undefined,
        address: data.addressStreet ?? undefined,
        addressNumber: data.addressNumber ?? undefined,
        complement: data.addressComplement ?? undefined,
        postalCode: data.addressZipCode ?? undefined,
        city: data.addressCity ?? undefined,
        province: data.addressState ?? undefined,
      }),
    })
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}))
      return { ok: false, error: `Asaas API error ${res.status}: ${JSON.stringify(errorBody)}` }
    }
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  }
}

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

export interface AsaasPayment {
  id: string
  status: string
  billingType: string
  dueDate: string
  bankSlipUrl?: string
  invoiceUrl?: string
  pixTransaction?: {
    qrCode: {
      encodedImage: string
      payload: string
    }
  }
}

export interface AsaasInstallmentPayment {
  id: string
  status: string
  billingType: string
  value: number
  dueDate: string
  installmentCount?: number
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
      billingType: "CREDIT_CARD"
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

  webhooks: {
    register: (data: {
      url: string
      email: string
      authToken: string
      events?: string[]
    }) =>
      asaasRequest("/webhooks", {
        method: "POST",
        body: JSON.stringify({
          name: "Pruma IA",
          url: data.url,
          email: data.email,
          sendType: "SEQUENTIALLY",
          apiVersion: 3,
          enabled: true,
          interrupted: false,
          authToken: data.authToken,
          events: data.events ?? [
            "PAYMENT_CONFIRMED",
            "PAYMENT_RECEIVED",
            "PAYMENT_OVERDUE",
            "PAYMENT_DELETED",
            "SUBSCRIPTION_DELETED",
          ],
        }),
      }),

    list: () => asaasRequest<{ data: object[] }>("/webhooks"),
  },

  payments: {
    list: (subscriptionId: string) =>
      asaasRequest<{ data: AsaasPayment[] }>(
        `/payments?subscription=${encodeURIComponent(subscriptionId)}&limit=1`
      ),

    create: (data: {
      customer: string
      billingType: "CREDIT_CARD"
      value: number
      dueDate: string
      description?: string
      installmentCount?: number
      installmentValue?: number
      creditCard: object
      creditCardHolderInfo: object
      remoteIp?: string
    }) =>
      asaasRequest<AsaasInstallmentPayment>("/payments", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
}
