"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  GitBranch,
  CheckSquare,
  Users,
  CreditCard,
  Settings,
  LogOut,
} from "lucide-react"
import { signOut } from "next-auth/react"

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/flows", label: "Fluxos", icon: GitBranch },
  { href: "/approvals", label: "Aprovações", icon: CheckSquare },
  { href: "/settings/members", label: "Equipe", icon: Users },
  { href: "/billing", label: "Plano", icon: CreditCard },
  { href: "/settings", label: "Configurações", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-60 flex-col border-r bg-sidebar">
      <div className="flex h-16 items-center border-b border-sidebar-border px-5">
        <Image
          src="/logo-white.png"
          alt="Pruma IA"
          width={120}
          height={32}
          priority
          className="h-8 w-auto object-contain"
        />
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sair
        </button>
      </div>
    </aside>
  )
}
