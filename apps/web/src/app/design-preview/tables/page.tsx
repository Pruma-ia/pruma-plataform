import { Button } from "@/components/ui/button"
import { MoreHorizontal, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react"

const rows = [
  { id: "#001", title: "Aprovação de contrato", flow: "Onboarding jurídico", requester: "n8n · #8821", status: "Pendente", statusClass: "bg-amber-50 text-amber-700 border-amber-200", date: "28/04/2026" },
  { id: "#002", title: "Validação KYC", flow: "KYC automático", requester: "n8n · #8799", status: "Aprovado", statusClass: "bg-emerald-50 text-emerald-700 border-emerald-200", date: "27/04/2026" },
  { id: "#003", title: "Revisão de proposta comercial", flow: "Vendas", requester: "n8n · #8712", status: "Rejeitado", statusClass: "bg-red-50 text-red-700 border-red-200", date: "26/04/2026" },
  { id: "#004", title: "Aprovação de orçamento", flow: "Financeiro", requester: "n8n · #8700", status: "Aprovado", statusClass: "bg-emerald-50 text-emerald-700 border-emerald-200", date: "25/04/2026" },
]

export default function TablesPage() {
  return (
    <div className="max-w-5xl space-y-10">
      <div>
        <h1 className="font-heading text-2xl font-bold">Tabelas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Padrão para listagens. Sempre com: header fixo, hover em linha, ações inline e paginação.
        </p>
      </div>

      {/* Full table */}
      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Tabela Completa</h2>
        {/* Toolbar */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="search"
              placeholder="Buscar aprovações..."
              className="h-8 w-64 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <select className="h-8 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">Todos os status</option>
              <option>Pendente</option>
              <option>Aprovado</option>
              <option>Rejeitado</option>
            </select>
          </div>
          <Button size="sm">
            + Nova aprovação
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left">
                  <button className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground">
                    ID
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Título</th>
                <th className="px-4 py-3 text-left">
                  <button className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground">
                    Fluxo
                    <ChevronUp className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left">
                  <button className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground">
                    Data
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.id}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{row.title}</p>
                    <p className="text-xs text-muted-foreground">{row.requester}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{row.flow}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium ${row.statusClass}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{row.date}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm">Ver</Button>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">4 resultados</p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="xs" disabled>Anterior</Button>
              <Button variant="outline" size="xs" className="bg-primary text-primary-foreground border-primary">1</Button>
              <Button variant="outline" size="xs">2</Button>
              <Button variant="outline" size="xs">Próximo</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Specs */}
      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Convenções</h2>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="space-y-2 text-sm">
            <div className="flex gap-2"><span className="text-emerald-600">✓</span><span>Header com <code className="rounded bg-muted px-1 font-mono text-xs">bg-muted/40</code> e texto <code className="rounded bg-muted px-1 font-mono text-xs">text-muted-foreground</code></span></div>
            <div className="flex gap-2"><span className="text-emerald-600">✓</span><span>Hover em linha: <code className="rounded bg-muted px-1 font-mono text-xs">hover:bg-muted/30 transition-colors</code></span></div>
            <div className="flex gap-2"><span className="text-emerald-600">✓</span><span>Padding de célula: <code className="rounded bg-muted px-1 font-mono text-xs">px-4 py-3</code></span></div>
            <div className="flex gap-2"><span className="text-emerald-600">✓</span><span>Toolbar acima: busca à esquerda, ação primária à direita</span></div>
            <div className="flex gap-2"><span className="text-emerald-600">✓</span><span>Paginação abaixo com contagem de resultados</span></div>
            <div className="flex gap-2"><span className="text-emerald-600">✓</span><span>IDs em <code className="rounded bg-muted px-1 font-mono text-xs">font-mono text-xs text-muted-foreground</code></span></div>
            <div className="flex gap-2"><span className="text-destructive">✗</span><span>Tabela sem estado vazio definido</span></div>
            <div className="flex gap-2"><span className="text-destructive">✗</span><span>Ação destrutiva diretamente na linha sem confirm dialog</span></div>
          </div>
        </div>
      </section>
    </div>
  )
}
