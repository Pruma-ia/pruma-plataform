export default function TypographyPage() {
  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="font-heading text-2xl font-bold">Tipografia</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Barlow (headings) + Inter (body). Mínimo 16px body em mobile para evitar auto-zoom do iOS.
        </p>
      </div>

      {/* Font families */}
      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Famílias</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              font-heading — Barlow
            </p>
            <p className="font-heading text-2xl font-bold">Pruma IA</p>
            <p className="font-heading text-lg font-semibold">Aprovações em tempo real</p>
            <p className="font-heading text-base font-medium">Gestão de fluxos n8n</p>
            <p className="mt-3 font-mono text-xs text-muted-foreground">
              font-family: var(--font-barlow) · h1–h6
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              font-sans — Inter
            </p>
            <p className="text-base font-normal leading-relaxed">
              Conecte fluxos n8n ao painel de aprovações humanas.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Texto secundário e descrições de interface.
            </p>
            <p className="mt-3 font-mono text-xs text-muted-foreground">
              font-family: var(--font-inter) · body, labels, inputs
            </p>
          </div>
        </div>
      </section>

      {/* Type scale */}
      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Escala de Tipo</h2>
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {[
            { cls: "text-4xl font-bold font-heading", size: "36px", label: "text-4xl", use: "Display — landing" },
            { cls: "text-3xl font-bold font-heading", size: "30px", label: "text-3xl", use: "Hero title (h1)" },
            { cls: "text-2xl font-semibold font-heading", size: "24px", label: "text-2xl", use: "Page title (h2)" },
            { cls: "text-xl font-semibold font-heading", size: "20px", label: "text-xl", use: "Seção title (h3)" },
            { cls: "text-lg font-medium", size: "18px", label: "text-lg", use: "Subtítulo, intro" },
            { cls: "text-base font-normal", size: "16px", label: "text-base", use: "Body principal ← mínimo" },
            { cls: "text-sm font-normal", size: "14px", label: "text-sm", use: "Body secundário, inputs, tabelas" },
            { cls: "text-xs font-medium", size: "12px", label: "text-xs", use: "Labels, captions, badges" },
          ].map((t) => (
            <div key={t.label} className="flex items-baseline gap-6 px-5 py-4">
              <div className="w-44 shrink-0">
                <p className={t.cls}>Pruma IA</p>
              </div>
              <div className="flex items-center gap-4">
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{t.label}</code>
                <span className="font-mono text-xs text-muted-foreground">{t.size}</span>
                <span className="text-xs text-muted-foreground">{t.use}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Weights */}
      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Pesos</h2>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="space-y-3">
            {[
              { cls: "font-normal", weight: "400", use: "Body, descrições" },
              { cls: "font-medium", weight: "500", use: "Labels, nav items ativos" },
              { cls: "font-semibold", weight: "600", use: "Headings, botões, CTAs" },
              { cls: "font-bold", weight: "700", use: "Hero titles, destaque crítico" },
            ].map((w) => (
              <div key={w.weight} className="flex items-center gap-6">
                <p className={`w-48 text-base ${w.cls}`}>Aprovações humanas</p>
                <code className="rounded bg-muted px-1.5 font-mono text-xs">{w.cls}</code>
                <span className="font-mono text-xs text-muted-foreground">{w.weight}</span>
                <span className="text-xs text-muted-foreground">{w.use}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Text colors */}
      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Hierarquia de Cor do Texto</h2>
        <div className="rounded-xl border border-border bg-card p-6 space-y-2">
          <p className="text-base text-foreground font-medium">text-foreground — texto principal</p>
          <p className="text-base text-muted-foreground">text-muted-foreground — texto secundário, descrições</p>
          <p className="text-base text-accent font-medium">text-accent — Ciano Elétrico — links, highlights</p>
          <p className="text-base text-destructive">text-destructive — erros, aviso crítico</p>
          <p className="text-base text-primary font-semibold">text-primary — Azul Marinho em texto</p>
        </div>
      </section>
    </div>
  )
}
