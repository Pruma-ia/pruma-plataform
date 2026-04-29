function Badge({
  label,
  className,
}: {
  label: string
  className: string
}) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  )
}

function BadgeDot({
  label,
  dotClass,
  className,
}: {
  label: string
  dotClass: string
  className: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
      {label}
    </span>
  )
}

export default function BadgesPage() {
  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="font-heading text-2xl font-bold">Badges & Status</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Status de aprovações, assinaturas, fluxos e tags gerais.
        </p>
      </div>

      {/* Approval status */}
      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Status de Aprovação</h2>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col items-start gap-1.5">
              <Badge label="Pendente" className="bg-amber-50 text-amber-700 border-amber-200" />
              <code className="font-mono text-xs text-muted-foreground">amber</code>
            </div>
            <div className="flex flex-col items-start gap-1.5">
              <Badge label="Aprovado" className="bg-emerald-50 text-emerald-700 border-emerald-200" />
              <code className="font-mono text-xs text-muted-foreground">emerald</code>
            </div>
            <div className="flex flex-col items-start gap-1.5">
              <Badge label="Rejeitado" className="bg-red-50 text-red-700 border-red-200" />
              <code className="font-mono text-xs text-muted-foreground">red</code>
            </div>
          </div>
        </div>
      </section>

      {/* Subscription status */}
      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Status de Assinatura</h2>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col items-start gap-1.5">
              <Badge label="Trial" className="bg-secondary text-secondary-foreground border-border" />
              <code className="font-mono text-xs text-muted-foreground">secondary</code>
            </div>
            <div className="flex flex-col items-start gap-1.5">
              <Badge label="Ativo" className="bg-emerald-50 text-emerald-700 border-emerald-200" />
              <code className="font-mono text-xs text-muted-foreground">emerald</code>
            </div>
            <div className="flex flex-col items-start gap-1.5">
              <Badge label="Inadimplente" className="bg-amber-50 text-amber-700 border-amber-200" />
              <code className="font-mono text-xs text-muted-foreground">amber</code>
            </div>
            <div className="flex flex-col items-start gap-1.5">
              <Badge label="Cancelado" className="bg-muted text-muted-foreground border-border" />
              <code className="font-mono text-xs text-muted-foreground">muted</code>
            </div>
            <div className="flex flex-col items-start gap-1.5">
              <Badge label="Inativo" className="bg-muted text-muted-foreground border-border" />
              <code className="font-mono text-xs text-muted-foreground">muted</code>
            </div>
          </div>
        </div>
      </section>

      {/* With dot */}
      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Com Indicador (Dot)</h2>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-wrap gap-3">
            <BadgeDot label="Online" dotClass="bg-emerald-500" className="bg-emerald-50 text-emerald-700 border-emerald-200" />
            <BadgeDot label="Processando" dotClass="bg-amber-500 animate-pulse" className="bg-amber-50 text-amber-700 border-amber-200" />
            <BadgeDot label="Falhou" dotClass="bg-red-500" className="bg-red-50 text-red-700 border-red-200" />
            <BadgeDot label="Pausado" dotClass="bg-muted-foreground" className="bg-muted text-muted-foreground border-border" />
          </div>
        </div>
      </section>

      {/* Dev-only */}
      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Tags Especiais</h2>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-wrap gap-3">
            <Badge label="Dev only" className="bg-amber-50 text-amber-700 border-amber-200" />
            <Badge label="Beta" className="bg-secondary text-secondary-foreground border-border" />
            <Badge label="Novo" className="bg-accent text-white border-accent" />
            <Badge label="Superadmin" className="bg-primary text-primary-foreground border-primary" />
          </div>
        </div>
      </section>

      {/* Usage in context */}
      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Em Contexto — Linha de Tabela</h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Aprovação</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fluxo</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { id: "#001", flow: "Onboarding cliente", status: "Pendente", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
                { id: "#002", flow: "Aprovação de contrato", status: "Aprovado", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                { id: "#003", flow: "Validação de dados", status: "Rejeitado", badgeClass: "bg-red-50 text-red-700 border-red-200" },
              ].map((row) => (
                <tr key={row.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.id}</td>
                  <td className="px-4 py-3 font-medium">{row.flow}</td>
                  <td className="px-4 py-3">
                    <Badge label={row.status} className={row.badgeClass} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
