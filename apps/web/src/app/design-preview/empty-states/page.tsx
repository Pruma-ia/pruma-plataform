import { Button } from "@/components/ui/button"
import { ClipboardList, Search, ShieldOff, AlertCircle, Plus, RefreshCw } from "lucide-react"

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType
  title: string
  description: string
  action?: { label: string; variant?: "default" | "outline" }
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card px-8 py-16 text-center">
      <div className="rounded-full bg-muted p-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mt-4 font-heading text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>
      {action && (
        <div className="mt-6">
          <Button variant={action.variant ?? "default"}>{action.label}</Button>
        </div>
      )}
    </div>
  )
}

export default function EmptyStatesPage() {
  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <h1 className="font-heading text-2xl font-bold">Empty States</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Toda listagem e seção com dados precisa de um estado vazio. Nunca deixar área em branco.
        </p>
      </div>

      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Sem dados ainda</h2>
        <EmptyState
          icon={ClipboardList}
          title="Nenhuma aprovação encontrada"
          description="Quando o n8n enviar uma solicitação de aprovação, ela aparecerá aqui."
          action={{ label: "+ Criar fluxo no n8n" }}
        />
      </section>

      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Sem resultados de busca</h2>
        <EmptyState
          icon={Search}
          title="Nenhum resultado para &quot;onboarding cliente&quot;"
          description="Tente uma busca diferente ou limpe os filtros aplicados."
          action={{ label: "Limpar filtros", variant: "outline" }}
        />
      </section>

      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Sem permissão</h2>
        <EmptyState
          icon={ShieldOff}
          title="Acesso restrito"
          description="Você não tem permissão para visualizar este recurso. Contate o administrador da organização."
        />
      </section>

      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Erro ao carregar</h2>
        <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 px-8 py-16 text-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="mt-4 font-heading text-base font-semibold text-foreground">Falha ao carregar aprovações</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Ocorreu um erro ao buscar os dados. Tente novamente ou contate o suporte.
          </p>
          <div className="mt-6 flex gap-2">
            <Button variant="outline">
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </div>
        </div>
      </section>

      {/* In-table empty */}
      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Vazio dentro de Tabela</h2>
        <div className="rounded-xl border border-border bg-card shadow-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Título</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={3}>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <ClipboardList className="h-8 w-8 text-muted-foreground/40" />
                    <p className="mt-2 text-sm font-medium text-muted-foreground">Nenhuma aprovação</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Aguardando solicitações do n8n</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Rules */}
      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Regras</h2>
        <div className="rounded-xl border border-border bg-card p-6 space-y-2 text-sm">
          <div className="flex gap-2"><span className="text-emerald-600">✓</span><span>Toda listagem tem estado vazio definido antes de ir para produção</span></div>
          <div className="flex gap-2"><span className="text-emerald-600">✓</span><span>Ícone + título + descrição útil + ação quando aplicável</span></div>
          <div className="flex gap-2"><span className="text-emerald-600">✓</span><span>Erro: cor destrutiva + botão de retry</span></div>
          <div className="flex gap-2"><span className="text-emerald-600">✓</span><span>Descrição explica POR QUÊ está vazio, não só que está vazio</span></div>
          <div className="flex gap-2"><span className="text-destructive">✗</span><span>Área simplesmente em branco sem nenhuma mensagem</span></div>
          <div className="flex gap-2"><span className="text-destructive">✗</span><span>"Sem dados" genérico sem contexto ou próximo passo</span></div>
        </div>
      </section>
    </div>
  )
}
