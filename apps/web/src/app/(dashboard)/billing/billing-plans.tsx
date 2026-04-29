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
      <h2 className="mb-4 font-semibold">Plano</h2>
      <div className="max-w-sm">
        <div className="rounded-xl border border-primary ring-1 ring-primary bg-primary/5 p-6 flex flex-col shadow-sm">
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
            type="button"
            onClick={() => setCheckoutOpen(true)}
            disabled={isCurrent}
            className={`mt-6 w-full rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
              isCurrent
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {isCurrent ? "Plano atual" : "Assinar"}
          </button>
        </div>
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
