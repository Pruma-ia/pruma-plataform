import { db } from "@/lib/db"
import { organizations } from "../../../../../../db/schema"
import { eq } from "drizzle-orm"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, LayoutDashboard, GitBranch, CheckSquare, CreditCard, ShieldAlert } from "lucide-react"

const navItems = [
  { label: "Dashboard", href: "", icon: LayoutDashboard },
  { label: "Fluxos", href: "/flows", icon: GitBranch },
  { label: "Aprovações", href: "/approvals", icon: CheckSquare },
  { label: "Cobrança", href: "/billing", icon: CreditCard },
]

export default async function AdminOrgLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ orgId: string }>
}) {
  const { orgId } = await params

  const [org] = await db
    .select({ id: organizations.id, name: organizations.name, slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.id, orgId))

  if (!org) notFound()

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r bg-sidebar flex flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
          <Link
            href="/admin"
            className="flex items-center gap-1.5 text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao Admin
          </Link>
        </div>

        <div className="px-4 py-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E0F6FE] text-[#0D1B4B] font-bold text-sm shrink-0">
              {org.name[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">{org.name}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{org.slug}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={`/admin/orgs/${org.id}${item.href}`}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Admin mode banner */}
        <div className="flex items-center gap-2 bg-[#0D1B4B] px-6 py-2 text-xs text-white">
          <ShieldAlert className="h-3.5 w-3.5 text-[#5CCFF5]" />
          <span>
            Modo Admin — visualizando <strong>{org.name}</strong> (somente leitura)
          </span>
        </div>
        {children}
      </div>
    </div>
  )
}
