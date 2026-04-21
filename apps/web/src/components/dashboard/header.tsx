"use client"

import { useSession } from "next-auth/react"
import { useTheme } from "@/components/theme-provider"
import { Bell, Sun, Moon } from "lucide-react"

export function Header({ title }: { title: string }) {
  const { data: session } = useSession()
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="flex items-center gap-4">
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="rounded-full p-2 hover:bg-muted transition-colors"
          aria-label="Alternar tema"
        >
          {resolvedTheme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <button className="relative rounded-full p-2 hover:bg-muted transition-colors">
          <Bell className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          {session?.user?.image ? (
            <img
              src={session.user.image}
              alt={session.user.name ?? ""}
              className="h-8 w-8 rounded-full"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00AEEF] text-white text-sm font-semibold">
              {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
          )}
          <span className="text-sm font-medium">{session?.user?.name}</span>
        </div>
      </div>
    </header>
  )
}
