import { Button } from "@/components/ui/button"
import { Plus, MoreHorizontal, ChevronRight, ArrowLeft, Loader2 } from "lucide-react"

const inputBase =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

export default function CrudPage() {
  return (
    <div className="max-w-5xl space-y-16">
      <div>
        <h1 className="font-heading text-2xl font-bold">CRUD Pattern Completo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Padrão reutilizável para List, Form e Detail. Toda nova entidade segue este template.
        </p>
      </div>

      {/* ── LIST PAGE ── */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <span className="rounded-md bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">1</span>
          <h2 className="font-heading text-lg font-semibold">List Page — Listagem com Tabela</h2>
        </div>
        <div className="rounded-xl border-2 border-dashed border-border">
          <div className="rounded-xl overflow-hidden">
            {/* Page header */}
            <div className="flex items-start justify-between bg-background px-6 py-5 border-b border-border">
              <div>
                <h1 className="font-heading text-xl font-bold text-foreground">Membros</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">7 membros na organização</p>
              </div>
              <Button size="sm">
                <Plus className="h-4 w-4" />
                Convidar membro
              </Button>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-2 bg-background px-6 py-3 border-b border-border">
              <input type="search" placeholder="Buscar por nome ou e-mail..." className={`${inputBase} w-64 h-8`} />
              <select className={`${inputBase} w-36 h-8`}>
                <option>Todas as funções</option>
                <option>Admin</option>
                <option>Membro</option>
              </select>
            </div>

            {/* Table */}
            <div className="bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Membro</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Função</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { name: "João Silva", email: "joao@empresa.com", role: "Admin", status: "Ativo", statusClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                    { name: "Maria Costa", email: "maria@empresa.com", role: "Membro", status: "Ativo", statusClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                    { name: "Pedro Lima", email: "pedro@empresa.com", role: "Membro", status: "Convite pendente", statusClass: "bg-amber-50 text-amber-700 border-amber-200" },
                  ].map((m) => (
                    <tr key={m.email} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                            {m.name.split(" ").map(n => n[0]).join("")}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{m.name}</p>
                            <p className="text-xs text-muted-foreground">{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{m.role}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium ${m.statusClass}`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between border-t border-border px-4 py-3">
                <p className="text-xs text-muted-foreground">3 de 7 membros</p>
                <div className="flex gap-1">
                  <Button variant="outline" size="xs" disabled>Anterior</Button>
                  <Button variant="outline" size="xs" className="bg-primary text-primary-foreground border-primary">1</Button>
                  <Button variant="outline" size="xs">2</Button>
                  <Button variant="outline" size="xs">Próximo</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FORM PAGE ── */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <span className="rounded-md bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">2</span>
          <h2 className="font-heading text-lg font-semibold">Form Page — Criar / Editar</h2>
        </div>
        <div className="rounded-xl border-2 border-dashed border-border">
          <div className="rounded-xl overflow-hidden bg-background">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border px-6 py-4">
              <button className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h1 className="font-heading text-lg font-bold">Convidar membro</h1>
                <p className="text-xs text-muted-foreground">Membros › Novo convite</p>
              </div>
            </div>

            {/* Form */}
            <div className="p-6 max-w-lg">
              <div className="rounded-xl border border-border bg-card p-6 shadow-md space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="crud-nome" className="block text-sm font-medium">
                      Nome <span className="text-destructive">*</span>
                    </label>
                    <input id="crud-nome" type="text" autoComplete="given-name" placeholder="João" className={inputBase} />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="crud-sobrenome" className="block text-sm font-medium">
                      Sobrenome <span className="text-destructive">*</span>
                    </label>
                    <input id="crud-sobrenome" type="text" autoComplete="family-name" placeholder="Silva" className={inputBase} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="crud-email" className="block text-sm font-medium">
                    E-mail <span className="text-destructive">*</span>
                  </label>
                  <input id="crud-email" type="email" autoComplete="email" placeholder="joao@empresa.com" className={inputBase} />
                  <p className="text-xs text-muted-foreground">Um convite será enviado para este endereço.</p>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="crud-role" className="block text-sm font-medium">Função</label>
                  <select id="crud-role" className={inputBase}>
                    <option value="member">Membro</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <Button>Enviar convite</Button>
                <Button variant="outline">Cancelar</Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DETAIL PAGE ── */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <span className="rounded-md bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">3</span>
          <h2 className="font-heading text-lg font-semibold">Detail Page — Visualização</h2>
        </div>
        <div className="rounded-xl border-2 border-dashed border-border">
          <div className="rounded-xl overflow-hidden bg-background">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <button className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-heading text-lg font-bold">João Silva</h1>
                    <span className="inline-flex items-center rounded-sm border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      Ativo
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Membros › João Silva</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Editar</Button>
                <Button variant="destructive" size="sm">Remover</Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-5 shadow-md space-y-4">
                <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Dados do membro
                </h3>
                {[
                  { label: "Nome completo", value: "João Silva" },
                  { label: "E-mail", value: "joao@empresa.com" },
                  { label: "Função", value: "Administrador" },
                  { label: "Membro desde", value: "15 de março de 2026" },
                ].map((f) => (
                  <div key={f.label}>
                    <p className="text-xs text-muted-foreground">{f.label}</p>
                    <p className="mt-0.5 text-sm font-medium text-foreground">{f.value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-border bg-card p-5 shadow-md space-y-4">
                <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Atividade recente
                </h3>
                <div className="space-y-3">
                  {[
                    { action: "Aprovou aprovação #0041", time: "há 2 horas" },
                    { action: "Rejeitou aprovação #0038", time: "há 1 dia" },
                    { action: "Alterou configurações da org.", time: "há 3 dias" },
                  ].map((a) => (
                    <div key={a.action} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                      <div>
                        <p className="text-foreground">{a.action}</p>
                        <p className="text-xs text-muted-foreground">{a.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pattern summary */}
      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Resumo do Padrão</h2>
        <div className="rounded-xl border border-border bg-card p-6 shadow-md">
          <div className="grid gap-6 sm:grid-cols-3 text-sm">
            <div>
              <p className="font-semibold text-foreground mb-2">List Page</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Page header: título + contagem + CTA</li>
                <li>• Toolbar: busca + filtros</li>
                <li>• Tabela com hover e ações inline</li>
                <li>• Paginação abaixo</li>
                <li>• Estado vazio definido</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-2">Form Page</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Voltar acima do título</li>
                <li>• Breadcrumb de contexto</li>
                <li>• Card contendo o form</li>
                <li>• Labels + helper text</li>
                <li>• Salvar + Cancelar no rodapé</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-2">Detail Page</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Voltar + título + status badge</li>
                <li>• Ações à direita do header</li>
                <li>• Cards de informação em grid</li>
                <li>• Dados em label/valor</li>
                <li>• Atividade/histórico opcional</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
