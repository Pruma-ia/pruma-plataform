function Swatch({
  label,
  hex,
  className,
  textClass = "text-white",
}: {
  label: string
  hex: string
  className: string
  textClass?: string
}) {
  return (
    <div className={`${className} flex h-20 flex-col justify-end rounded-lg p-3`}>
      <p className={`text-xs font-semibold ${textClass}`}>{label}</p>
      <p className={`font-mono text-xs opacity-70 ${textClass}`}>{hex}</p>
    </div>
  )
}

function TokenRow({
  token,
  desc,
  className,
}: {
  token: string
  desc: string
  className: string
}) {
  return (
    <div className="flex items-center gap-4">
      <div className={`${className} h-10 w-16 shrink-0 rounded-md border border-border`} />
      <div>
        <p className="font-mono text-sm font-medium">{token}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  )
}

export default function ColorsPage() {
  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="font-heading text-2xl font-bold">Cores</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Nunca usar hex hardcoded em componentes — sempre token ou classe Tailwind semântica.
        </p>
      </div>

      {/* Brand palette */}
      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Paleta de Marca</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          <Swatch label="Azul Marinho" hex="#0D1B4B" className="bg-[#0D1B4B]" />
          <Swatch label="Azul Médio" hex="#162460" className="bg-[#162460]" />
          <Swatch label="Azul Profundo" hex="#1E3080" className="bg-[#1E3080]" />
          <Swatch label="Ciano Elétrico" hex="#00AEEF" className="bg-[#00AEEF]" />
          <Swatch label="Ciano Claro" hex="#5CCFF5" className="bg-[#5CCFF5]" textClass="text-[#0D1B4B]" />
          <Swatch label="Ciano Pálido" hex="#E0F6FE" className="bg-[#E0F6FE]" textClass="text-[#0D1B4B]" />
        </div>
      </section>

      {/* Semantic tokens */}
      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Tokens Semânticos — Light Mode</h2>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="space-y-4">
            <TokenRow token="bg-background" desc="Fundo da página — off-white azulado" className="bg-background" />
            <TokenRow token="bg-card" desc="Card — branco puro, flutua acima do background" className="bg-card" />
            <TokenRow token="bg-primary" desc="Azul Marinho — botão primário, sidebar" className="bg-primary" />
            <TokenRow token="bg-secondary" desc="Ciano Pálido — botão secundário, badge bg" className="bg-secondary" />
            <TokenRow token="bg-accent" desc="Ciano Elétrico — CTAs, focus ring, highlight" className="bg-accent" />
            <TokenRow token="bg-muted" desc="Fundo mutado — inputs, seções neutras" className="bg-muted" />
            <TokenRow token="bg-destructive/20" desc="Vermelho — erros, ações destrutivas" className="bg-destructive/20 border-destructive/30" />
          </div>
        </div>
      </section>

      {/* Status colors */}
      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Cores de Status</h2>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center rounded-sm border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
                Pendente
              </span>
              <code className="font-mono text-xs text-muted-foreground">bg-amber-50 text-amber-700 border-amber-200</code>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center rounded-sm border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                Aprovado / Ativo
              </span>
              <code className="font-mono text-xs text-muted-foreground">bg-emerald-50 text-emerald-700 border-emerald-200</code>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center rounded-sm border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-700">
                Rejeitado / Erro
              </span>
              <code className="font-mono text-xs text-muted-foreground">bg-red-50 text-red-700 border-red-200</code>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center rounded-sm border border-border bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
                Trial / Info
              </span>
              <code className="font-mono text-xs text-muted-foreground">bg-secondary text-secondary-foreground</code>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center rounded-sm border border-border bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
                Cancelado / Inativo
              </span>
              <code className="font-mono text-xs text-muted-foreground">bg-muted text-muted-foreground</code>
            </div>
          </div>
        </div>
      </section>

      {/* Anti-patterns */}
      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Anti-Patterns</h2>
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5">
          <ul className="space-y-1.5 text-sm">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-destructive">✗</span>
              <span><code className="rounded bg-muted px-1 font-mono text-xs">className="bg-[#00AEEF]"</code> — hex hardcoded. Usar <code className="rounded bg-muted px-1 font-mono text-xs">bg-accent</code></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-destructive">✗</span>
              <span>Usar cor da marca para indicar erro — sempre <code className="rounded bg-muted px-1 font-mono text-xs">bg-destructive</code> ou <code className="rounded bg-muted px-1 font-mono text-xs">bg-red-*</code></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-destructive">✗</span>
              <span>Inventar variante de cor não mapeada neste guia</span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  )
}
