import Link from "next/link"

const sections = [
  { href: "/design-preview", label: "Visão Geral" },
  { href: "/design-preview/colors", label: "Cores" },
  { href: "/design-preview/typography", label: "Tipografia" },
  { href: "/design-preview/buttons", label: "Botões" },
  { href: "/design-preview/badges", label: "Badges & Status" },
  { href: "/design-preview/inputs", label: "Inputs & Forms" },
  { href: "/design-preview/cards", label: "Cards" },
  { href: "/design-preview/tables", label: "Tabelas" },
  { href: "/design-preview/modals", label: "Modais & Dialogs" },
  { href: "/design-preview/empty-states", label: "Empty States" },
  { href: "/design-preview/loading", label: "Loading States" },
  { href: "/design-preview/navigation", label: "Navegação" },
  { href: "/design-preview/crud", label: "CRUD Pattern" },
]

export default function DesignPreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar nav */}
      <aside className="w-56 shrink-0 border-r border-border bg-card p-4">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Design System
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">Pruma IA</p>
        </div>
        <nav className="flex flex-col gap-0.5">
          {sections.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="rounded-md px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {s.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Apenas em desenvolvimento.{" "}
            <span className="font-medium">Não indexado em prod.</span>
          </p>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  )
}
