import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-muted ${className}`} />
  )
}

export default function LoadingPage() {
  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <h1 className="font-heading text-2xl font-bold">Loading States</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Operações &gt;300ms mostram skeleton ou spinner. Nunca deixar área em branco durante carregamento.
        </p>
      </div>

      {/* Skeleton cards */}
      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Skeleton — Cards de Métrica</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 shadow-md">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="mt-4 h-7 w-16" />
              <Skeleton className="mt-2 h-4 w-28" />
              <Skeleton className="mt-1 h-3 w-20" />
            </div>
          ))}
        </div>
      </section>

      {/* Skeleton table */}
      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Skeleton — Tabela</h2>
        <div className="rounded-xl border border-border bg-card shadow-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Título</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fluxo</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-4">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="mt-1 h-3 w-24" />
                  </td>
                  <td className="px-4 py-4">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="px-4 py-4">
                    <Skeleton className="h-5 w-20 rounded-sm" />
                  </td>
                  <td className="px-4 py-4">
                    <Skeleton className="h-4 w-24" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Skeleton form */}
      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Skeleton — Formulário</h2>
        <div className="rounded-xl border border-border bg-card p-6 shadow-md space-y-5">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-full" />
            </div>
          </div>
          <Skeleton className="h-8 w-28" />
        </div>
      </section>

      {/* Spinners */}
      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Spinners — Uso em Botões e Inline</h2>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <Button disabled>
              <Loader2 className="animate-spin" />
              Salvando...
            </Button>
            <Button disabled variant="outline">
              <Loader2 className="animate-spin" />
              Carregando...
            </Button>
            <Button disabled variant="destructive">
              <Loader2 className="animate-spin" />
              Excluindo...
            </Button>
          </div>

          <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Sincronizando com n8n...</span>
          </div>

          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
            <span className="text-sm font-medium text-foreground">Processando aprovação</span>
          </div>
        </div>
      </section>

      {/* Full page loading */}
      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Loading de Página Completa</h2>
        <div className="relative rounded-xl border border-border bg-card overflow-hidden" style={{ height: 240 }}>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-sm text-muted-foreground">Carregando aprovações...</p>
          </div>
        </div>
      </section>

      {/* Rules */}
      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Regras</h2>
        <div className="rounded-xl border border-border bg-card p-6 space-y-2 text-sm">
          <div className="flex gap-2"><span className="text-emerald-600">✓</span><span>Operações &gt;300ms: skeleton ou spinner obrigatório</span></div>
          <div className="flex gap-2"><span className="text-emerald-600">✓</span><span>Botão async: <code className="rounded bg-muted px-1 font-mono text-xs">disabled</code> + <code className="rounded bg-muted px-1 font-mono text-xs">Loader2 animate-spin</code></span></div>
          <div className="flex gap-2"><span className="text-emerald-600">✓</span><span>Skeleton mantém layout estável — sem CLS</span></div>
          <div className="flex gap-2"><span className="text-emerald-600">✓</span><span>Skeleton usa <code className="rounded bg-muted px-1 font-mono text-xs">animate-pulse bg-muted</code></span></div>
          <div className="flex gap-2"><span className="text-destructive">✗</span><span>Área em branco durante carregamento</span></div>
          <div className="flex gap-2"><span className="text-destructive">✗</span><span>Spinner de longa duração sem mensagem de contexto</span></div>
        </div>
      </section>
    </div>
  )
}
