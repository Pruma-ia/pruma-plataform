"use client"

import { useState } from "react"
import {
  LayoutDashboard, GitBranch, CheckSquare, CreditCard, Settings, ChevronRight,
  Bell, Search, User
} from "lucide-react"

function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-accent"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  )
}

export default function NavigationPage() {
  const [activeTab, setActiveTab] = useState("aprovações")
  const [activeSidebarItem, setActiveSidebarItem] = useState("dashboard")

  const sidebarItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "flows", icon: GitBranch, label: "Fluxos" },
    { id: "approvals", icon: CheckSquare, label: "Aprovações", badge: "12" },
    { id: "billing", icon: CreditCard, label: "Cobrança" },
    { id: "settings", icon: Settings, label: "Configurações" },
  ]

  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <h1 className="font-heading text-2xl font-bold">Navegação</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sidebar fixa para navegação principal. Tabs para sub-navegação dentro de uma seção.
        </p>
      </div>

      {/* Sidebar */}
      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Sidebar — Navegação Principal</h2>
        <div className="flex gap-0 rounded-xl border border-border overflow-hidden shadow-md" style={{ height: 360 }}>
          {/* Sidebar */}
          <aside className="w-56 bg-primary flex flex-col">
            {/* Logo area */}
            <div className="flex items-center gap-2 px-4 py-5 border-b border-white/10">
              <div className="h-7 w-7 rounded-md bg-accent flex items-center justify-center">
                <span className="text-xs font-bold text-white">P</span>
              </div>
              <span className="font-heading text-sm font-semibold text-primary-foreground">Pruma IA</span>
            </div>
            {/* Nav items */}
            <nav className="flex-1 p-2 space-y-0.5">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSidebarItem(item.id)}
                  className={`w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                    activeSidebarItem === item.id
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className="rounded-full bg-accent px-1.5 py-0.5 text-xs font-medium text-white leading-none">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
            {/* User area */}
            <div className="border-t border-white/10 p-3">
              <button className="w-full flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors">
                <div className="h-6 w-6 rounded-full bg-sidebar-accent flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-sidebar-foreground" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-xs font-medium truncate">João Silva</p>
                  <p className="text-xs opacity-60 truncate">Admin</p>
                </div>
              </button>
            </div>
          </aside>

          {/* Content area */}
          <div className="flex-1 bg-background flex flex-col">
            {/* Top bar */}
            <div className="flex items-center justify-between border-b border-border px-5 py-3 bg-card">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    placeholder="Buscar..."
                    className="h-7 w-48 rounded-md border border-input bg-background pl-8 pr-3 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="relative rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <Bell className="h-4 w-4" />
                  <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-accent" />
                </button>
              </div>
            </div>
            {/* Page content */}
            <div className="flex-1 p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                {sidebarItems.find(i => i.id === activeSidebarItem)?.label}
              </p>
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Clique nos itens do menu para ver o estado ativo.</p>
      </section>

      {/* Tabs */}
      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Tabs — Sub-navegação</h2>
        <div className="rounded-xl border border-border bg-card shadow-md overflow-hidden">
          <div className="flex border-b border-border px-4">
            {["aprovações", "fluxos", "membros", "configurações"].map((tab) => (
              <Tab
                key={tab}
                label={tab.charAt(0).toUpperCase() + tab.slice(1)}
                active={activeTab === tab}
                onClick={() => setActiveTab(tab)}
              />
            ))}
          </div>
          <div className="p-6">
            <p className="text-sm text-muted-foreground">
              Conteúdo de <strong>{activeTab}</strong>
            </p>
          </div>
        </div>
      </section>

      {/* Breadcrumb */}
      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Breadcrumb — Hierarquia</h2>
        <div className="rounded-xl border border-border bg-card p-5 shadow-md">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-1 text-sm">
              {[
                { label: "Admin", href: "/admin" },
                { label: "Organizações", href: "/admin/orgs" },
                { label: "Empresa ABC", href: "/admin/orgs/123" },
                { label: "Cobrança", href: null },
              ].map((crumb, i, arr) => (
                <li key={crumb.label} className="flex items-center gap-1">
                  {crumb.href ? (
                    <span className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                      {crumb.label}
                    </span>
                  ) : (
                    <span className="font-medium text-foreground" aria-current="page">
                      {crumb.label}
                    </span>
                  )}
                  {i < arr.length - 1 && (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                  )}
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </section>

      {/* Page header */}
      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Page Header — Padrão</h2>
        <div className="rounded-xl border border-border bg-card p-6 shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <nav aria-label="Breadcrumb" className="mb-2">
                <ol className="flex items-center gap-1 text-xs text-muted-foreground">
                  <li>Aprovações</li>
                  <li><ChevronRight className="h-3 w-3 inline" /></li>
                  <li className="font-medium text-foreground">#0042</li>
                </ol>
              </nav>
              <h1 className="font-heading text-xl font-bold text-foreground">
                Aprovação de contrato — Cliente XYZ
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Fluxo: Revisão jurídica · Criado em 28 de abril de 2026
              </p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button className="h-8 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground hover:bg-muted">
                Rejeitar
              </button>
              <button className="h-8 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Aprovar
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
