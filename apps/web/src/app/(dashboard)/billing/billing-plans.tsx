"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { BillingCheckoutModal } from "./billing-checkout-modal"

const plan = {
  id: "pro",
  name: "Pro",
  price: "R$ 990",
  period: "/mês",
  description: "Solução completa para automação com aprovações humanas",
  features: [
    "Fluxos ilimitados",
    "Aprovações ilimitadas",
    "Usuários ilimitados",
    "Suporte prioritário",
    "Webhooks customizados",
    "SLA 99.9%",
  ],
}

interface Props {
  currentPlan: string | null
  profileIncomplete: boolean
}

export function BillingPlans({ currentPlan, profileIncomplete }: Props) {
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const isCurrent = currentPlan === plan.id

  return (
    <div>
      <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Plano</h2>
      <div className="rounded-xl border border-primary/20 ring-1 ring-primary/20 bg-card p-6 shadow-sm flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-primary">{plan.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-primary">{plan.price}</span>
              <span className="text-sm text-muted-foreground">{plan.period}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">cobrado mensalmente</p>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-border" />

        {/* Features — 2 colunas */}
        <ul className="grid grid-cols-2 gap-x-6 gap-y-2">
          {plan.features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-accent shrink-0" aria-hidden="true" />
              {f}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          type="button"
          onClick={() => setCheckoutOpen(true)}
          disabled={isCurrent}
          className={`w-full rounded-lg py-2.5 text-sm font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
            isCurrent
              ? "bg-muted text-muted-foreground"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          {isCurrent ? "Plano atual" : "Assinar"}
        </button>
      </div>

      <BillingCheckoutModal
        planLabel={plan.name}
        planPrice={plan.price}
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        profileIncomplete={profileIncomplete}
      />
    </div>
  )
}
