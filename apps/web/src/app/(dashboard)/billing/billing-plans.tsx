"use client"

import { useState } from "react"
import { Check } from "lucide-react"

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: "R$ 97",
    period: "/mês",
    description: "Para pequenas equipes e projetos iniciais",
    features: ["Até 10 fluxos ativos", "50 aprovações/mês", "2 usuários", "Suporte por e-mail"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "R$ 297",
    period: "/mês",
    description: "Para times em crescimento",
    features: [
      "Fluxos ilimitados",
      "500 aprovações/mês",
      "10 usuários",
      "Suporte prioritário",
      "Webhooks customizados",
    ],
    highlight: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "R$ 997",
    period: "/mês",
    description: "Para grandes operações",
    features: [
      "Tudo do Pro",
      "Aprovações ilimitadas",
      "Usuários ilimitados",
      "SLA 99.9%",
      "Onboarding dedicado",
    ],
  },
]

export function BillingPlans({ currentPlan }: { currentPlan: string | null }) {
  const [loading, setLoading] = useState<string | null>(null)

  async function subscribe(planId: string) {
    setLoading(planId)
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId, billingType: "PIX" }),
    })
    const data = await res.json()
    setLoading(null)
    if (data.url) {
      window.open(data.url, "_blank")
    } else if (data.ok) {
      window.location.reload()
    }
  }

  return (
    <div>
      <h2 className="mb-4 font-semibold">Escolha seu plano</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan
          return (
            <div
              key={plan.id}
              className={`rounded-xl border p-6 shadow-sm flex flex-col ${
                plan.highlight
                  ? "border-primary ring-1 ring-primary bg-primary/5"
                  : "bg-card"
              }`}
            >
              {plan.highlight && (
                <span className="mb-3 inline-block rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                  Mais popular
                </span>
              )}
              <h3 className="text-lg font-bold">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="mt-4 flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-[#00AEEF] shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => subscribe(plan.id)}
                disabled={isCurrent || !!loading}
                className={`mt-6 w-full rounded-lg py-2 text-sm font-medium transition-colors ${
                  isCurrent
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : plan.highlight
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-border hover:bg-muted"
                } disabled:opacity-60`}
              >
                {isCurrent ? "Plano atual" : loading === plan.id ? "Processando..." : "Assinar"}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
