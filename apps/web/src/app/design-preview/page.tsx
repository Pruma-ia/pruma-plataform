import Link from "next/link"

const sections = [
  {
    href: "/design-preview/colors",
    title: "Cores",
    desc: "Paleta de marca, tokens semânticos, light/dark mode",
  },
  {
    href: "/design-preview/typography",
    title: "Tipografia",
    desc: "Escala de tipo, pesos, line-height, Barlow + Inter",
  },
  {
    href: "/design-preview/buttons",
    title: "Botões",
    desc: "Variantes, tamanhos, estados (hover, focus, loading, disabled)",
  },
  {
    href: "/design-preview/badges",
    title: "Badges & Status",
    desc: "Status de aprovação, assinatura, tags de fluxo",
  },
  {
    href: "/design-preview/inputs",
    title: "Inputs & Forms",
    desc: "Campos, selects, labels, helper text, erros inline",
  },
  {
    href: "/design-preview/cards",
    title: "Cards",
    desc: "Card padrão, card com ação, card de métrica, card de item",
  },
  {
    href: "/design-preview/tables",
    title: "Tabelas",
    desc: "Tabela padrão, com ações, com sorting, responsiva",
  },
  {
    href: "/design-preview/modals",
    title: "Modais & Dialogs",
    desc: "Modal padrão, confirmação destrutiva, sheet lateral",
  },
  {
    href: "/design-preview/empty-states",
    title: "Empty States",
    desc: "Sem dados, sem resultados, sem permissão, erro",
  },
  {
    href: "/design-preview/loading",
    title: "Loading States",
    desc: "Skeleton, spinner, progress, shimmer",
  },
  {
    href: "/design-preview/navigation",
    title: "Navegação",
    desc: "Sidebar, tabs, breadcrumb, page header",
  },
  {
    href: "/design-preview/crud",
    title: "CRUD Pattern",
    desc: "List page, form page, detail page — padrão completo",
  },
]

export default function DesignPreviewIndex() {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-foreground">
          Pruma IA — Design System
        </h1>
        <p className="mt-2 text-muted-foreground">
          Referência visual para desenvolvimento. Todo componente novo parte daqui.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className="inline-flex items-center rounded-sm border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
            Dev only
          </span>
          <span className="text-xs text-muted-foreground">
            Não acessível em produção. Ver{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              design-system/MASTER.md
            </code>{" "}
            para spec completa.
          </span>
        </div>
      </div>

      {/* Quick tokens */}
      <div className="mb-8 rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 font-heading text-lg font-semibold">Tokens Rápidos</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="flex flex-col gap-2">
            <div className="h-10 w-full rounded-lg bg-primary" />
            <p className="text-xs font-medium">primary</p>
            <p className="font-mono text-xs text-muted-foreground">#0D1B4B</p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-10 w-full rounded-lg bg-accent" />
            <p className="text-xs font-medium">accent</p>
            <p className="font-mono text-xs text-muted-foreground">#00AEEF</p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-10 w-full rounded-lg bg-secondary border border-border" />
            <p className="text-xs font-medium">secondary</p>
            <p className="font-mono text-xs text-muted-foreground">#E0F6FE</p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-10 w-full rounded-lg bg-destructive/20 border border-destructive/30" />
            <p className="text-xs font-medium">destructive</p>
            <p className="font-mono text-xs text-muted-foreground">vermelho semântico</p>
          </div>
        </div>
      </div>

      {/* Section grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-accent/50 hover:shadow-md"
          >
            <h3 className="font-heading text-base font-semibold text-foreground group-hover:text-accent">
              {s.title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
