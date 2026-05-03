"use client"

import { useEffect, useState } from "react"
import { useTheme } from "@/components/theme-provider"
import { Bell, Sun, Moon } from "lucide-react"
import { OrgLogo } from "@/components/dashboard/org-logo"

interface HeaderProps {
  title: string
  orgName: string
  orgLogoUrl: string | null
}

export function Header({ title, orgName, orgLogoUrl }: HeaderProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-3">
        <OrgLogo logoUrl={orgLogoUrl} name={orgName} />
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="rounded-full p-2 hover:bg-muted transition-colors"
          aria-label="Alternar tema"
        >
          {mounted && (resolvedTheme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />)}
        </button>
        <button className="relative rounded-full p-2 hover:bg-muted transition-colors">
          <Bell className="h-5 w-5" />
        </button>
      </div>
    </header>
  )
}
