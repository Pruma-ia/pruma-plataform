import { Check } from "lucide-react"
import Link from "next/link"

const DELIVERABLES = [
  { num: "01", title: "Diagnóstico", desc: "Mapeamos os gargalos da sua operação" },
  { num: "02", title: "Construção", desc: "Automações sob medida para o seu negócio" },
  { num: "03", title: "Validação", desc: "Ajustes até o resultado ser exatamente o esperado" },
  { num: "04", title: "Operação Fluida", desc: "Evolução contínua junto ao crescimento do time" },
]

const PLAN_FEATURES = [
  "Aprovações ilimitadas, sem restrição de volume",
  "Time completo incluso — sem custo por usuário",
  "Integra com as ferramentas que você já usa",
  "Visibilidade total de cada decisão",
  "Plataforma disponível 24h por dia",
  "Suporte com retorno em até 4h",
]

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

interface Props {
  amount: number
  installments: number
}

export function BillingBundle({ amount, installments }: Props) {
  return (
    <div>
      <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Plano</h2>

      <div className="rounded-xl border border-primary/20 ring-1 ring-primary/20 bg-card shadow-sm overflow-hidden">
        {/* Badge row */}
        <div className="flex items-center justify-between px-6 pt-5">
          <span className="inline-flex items-center rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent uppercase tracking-wide">
            Preço de lançamento
          </span>
          <span className="text-xs font-medium text-emerald-600">Economia de R$ 509/mês</span>
        </div>

        {/* Two columns */}
        <div className="grid grid-cols-2 divide-x divide-border p-6 gap-0">
          {/* Left: Setup */}
          <div className="pr-6 flex flex-col gap-5">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Setup inicial</p>
              <p className="text-2xl font-bold text-primary">{formatBRL(amount)}</p>
              {installments > 1 && (
                <p className="text-sm text-muted-foreground">em {installments}x no cartão</p>
              )}
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-3">O que está incluso:</p>
              <ol className="space-y-3">
                {DELIVERABLES.map((d) => (
                  <li key={d.num} className="flex items-start gap-2.5">
                    <span className="text-xs font-bold text-accent shrink-0 mt-0.5">{d.num}</span>
                    <div>
                      <p className="text-sm font-medium leading-tight">{d.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{d.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Right: Plan */}
          <div className="pl-6 flex flex-col gap-5">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Plano Pro</p>
              <p className="text-sm text-muted-foreground line-through">R$ 1.499/mês</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-primary">R$ 990</span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">cobrado mensalmente</p>
            </div>

            <ul className="space-y-2.5">
              {PLAN_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="border-t bg-muted/30 px-6 py-5 flex flex-col gap-2">
          <Link
            href="/billing/checkout"
            className="w-full rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring outline-none text-center block"
          >
            Contratar agora
          </Link>
          <p className="text-center text-xs text-muted-foreground">
            Sem fidelidade · Cancele quando quiser
          </p>
        </div>
      </div>
    </div>
  )
}
