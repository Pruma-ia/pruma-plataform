import { MoreHorizontal, TrendingUp, Users, CheckCircle2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function CardsPage() {
  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <h1 className="font-heading text-2xl font-bold">Cards</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cards flutuam acima do background via <code className="rounded bg-muted px-1 font-mono text-xs">bg-card shadow-md rounded-xl</code>.
        </p>
      </div>

      {/* Metric cards */}
      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Cards de Métrica</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Aprovações pendentes", value: "12", delta: "+3 hoje", icon: Clock, iconClass: "text-amber-600 bg-amber-50" },
            { label: "Aprovadas este mês", value: "84", delta: "+12%", icon: CheckCircle2, iconClass: "text-emerald-600 bg-emerald-50" },
            { label: "Membros ativos", value: "7", delta: "2 convidados", icon: Users, iconClass: "text-accent bg-secondary" },
            { label: "Taxa de aprovação", value: "91%", delta: "↑ vs mês ant.", icon: TrendingUp, iconClass: "text-primary bg-secondary" },
          ].map((m) => (
            <div key={m.label} className="rounded-xl border border-border bg-card p-5 shadow-md">
              <div className="flex items-start justify-between">
                <div className={`rounded-lg p-2 ${m.iconClass}`}>
                  <m.icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4">
                <p className="font-heading text-2xl font-bold text-foreground">{m.value}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{m.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{m.delta}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Item cards */}
      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Cards de Item (Lista)</h2>
        <div className="space-y-3">
          {[
            { title: "Aprovação de contrato — Cliente ABC", flow: "Onboarding jurídico", status: "Pendente", statusClass: "bg-amber-50 text-amber-700 border-amber-200", time: "há 2 horas" },
            { title: "Validação de dados cadastrais", flow: "KYC automático", status: "Aprovado", statusClass: "bg-emerald-50 text-emerald-700 border-emerald-200", time: "há 1 dia" },
          ].map((item) => (
            <div
              key={item.title}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground truncate">{item.title}</p>
                  <span className={`shrink-0 inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium ${item.statusClass}`}>
                    {item.status}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {item.flow} · {item.time}
                </p>
              </div>
              <div className="ml-4 flex items-center gap-2">
                <Button variant="outline" size="sm">Ver</Button>
                <Button variant="ghost" size="icon-sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Content card */}
      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Card de Conteúdo (Detail)</h2>
        <div className="rounded-xl border border-border bg-card shadow-md">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <h3 className="font-heading text-base font-semibold">Aprovação #0042</h3>
              <p className="text-sm text-muted-foreground">Criada em 28 de abril de 2026</p>
            </div>
            <span className="inline-flex items-center rounded-sm border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              Pendente
            </span>
          </div>
          {/* Body */}
          <div className="p-6 space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Descrição</p>
              <p className="mt-1 text-sm text-foreground">
                Validação de contrato de prestação de serviços para o cliente XYZ Ltda. Verificar cláusulas 3, 7 e 12.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Fluxo</p>
                <p className="mt-1 text-sm font-medium">Revisão jurídica</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Solicitante</p>
                <p className="mt-1 text-sm font-medium">n8n · execução #8821</p>
              </div>
            </div>
          </div>
          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
            <Button variant="outline">Rejeitar</Button>
            <Button variant="default">Aprovar</Button>
          </div>
        </div>
      </section>

      {/* Info card */}
      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Cards de Informação / Alerta</h2>
        <div className="space-y-3">
          <div className="rounded-xl border border-accent/30 bg-secondary p-4">
            <p className="text-sm font-medium text-accent">Informação</p>
            <p className="mt-1 text-sm text-foreground">Seu período de trial termina em 7 dias. Configure sua assinatura para continuar.</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-700">Atenção</p>
            <p className="mt-1 text-sm text-amber-700/80">3 aprovações estão pendentes há mais de 48 horas.</p>
          </div>
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
            <p className="text-sm font-medium text-destructive">Erro</p>
            <p className="mt-1 text-sm text-destructive/80">Falha ao sincronizar com o n8n. Verifique as credenciais da integração.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
