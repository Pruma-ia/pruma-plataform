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
  Building2,
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

const adminNav = [
  { href: "/admin", label: "Clientes", icon: Building2 },
]

export function Sidebar({
  isSuperAdmin = false,
  userName = "",
  userImage = null,
}: {
  isSuperAdmin?: boolean
  userName?: string
  userImage?: string | null
}) {
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
              "flex items-center gap-3 border-l-2 px-3 py-2.5 text-sm font-medium transition-colors",
              pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
                ? "border-[#00AEEF] bg-white/10 text-white"
                : "border-transparent text-sidebar-foreground/70 hover:bg-white/5 hover:text-white"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {isSuperAdmin && (
        <div className="border-t border-sidebar-border p-3">
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
            Super Admin
          </p>
          {adminNav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 border-l-2 px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === href || pathname.startsWith(href)
                  ? "border-[#00AEEF] bg-white/10 text-white"
                  : "border-transparent text-sidebar-foreground/70 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
        </div>
      )}

      <div className="border-t border-sidebar-border p-3 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2">
          {userImage ? (
            <Image
              src={userImage}
              alt={userName}
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-cover shrink-0"
            />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#00AEEF]/20 text-sm font-semibold text-[#00AEEF]">
              {userName.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="truncate text-sm font-medium text-sidebar-foreground">{userName}</span>
        </div>
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
