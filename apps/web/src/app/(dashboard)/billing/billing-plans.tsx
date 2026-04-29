import { Check } from "lucide-react"
import Link from "next/link"

const plan = {
  id: "pro",
  name: "Pro",
  originalPrice: "R$ 1.499",
  price: "R$ 990",
  period: "/mês",
  savings: "Economia de R$ 509/mês",
  description: "Automação de aprovações humanas para o seu time",
  features: [
    "Aprovações ilimitadas, sem restrição de volume",
    "Time completo incluso — sem custo por usuário",
    "Integra com as ferramentas que você já usa",
    "Visibilidade total de cada decisão",
    "Plataforma disponível 24h por dia",
    "Suporte com retorno em até 4h",
  ],
}

interface Props {
  currentPlan: string | null
  profileIncomplete: boolean
}

export function BillingPlans({ currentPlan }: Props) {
  const isCurrent = currentPlan === plan.id

  return (
    <div>
      <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Plano</h2>
      <div className="rounded-xl border border-primary/20 ring-1 ring-primary/20 bg-card p-6 shadow-sm flex flex-col gap-5">
        {/* Badge lançamento */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent uppercase tracking-wide">
            Preço de lançamento
          </span>
          <span className="text-xs font-medium text-emerald-600">{plan.savings}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-primary">{plan.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm text-muted-foreground line-through">{plan.originalPrice}/mês</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-primary">{plan.price}</span>
              <span className="text-sm text-muted-foreground">{plan.period}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">cobrado mensalmente</p>
          </div>
        </div>

        <hr className="border-border" />

        {/* Features */}
        <ul className="grid grid-cols-2 gap-x-6 gap-y-2">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" aria-hidden="true" />
              {f}
            </li>
          ))}
        </ul>

        {/* CTA */}
        {isCurrent ? (
          <div className="w-full rounded-lg bg-muted py-2.5 text-sm font-medium text-muted-foreground text-center cursor-not-allowed">
            Plano atual
          </div>
        ) : (
          <Link
            href="/billing/checkout"
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring outline-none text-center block"
          >
            Assinar agora
          </Link>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Sem fidelidade · Cancele quando quiser
        </p>
      </div>
    </div>
  )
}
