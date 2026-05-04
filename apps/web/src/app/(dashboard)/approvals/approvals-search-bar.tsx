"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useRef, useCallback } from "react"
import { Search } from "lucide-react"

interface Props {
  defaultValue?: string
}

export function ApprovalsSearchBar({ defaultValue }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = useCallback(
    (value: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString())
        if (value) {
          params.set("q", value)
          params.set("page", "1")
        } else {
          params.delete("q")
        }
        router.push(`${pathname}?${params.toString()}`)
      }, 300)
    },
    [router, pathname, searchParams]
  )

  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <input
        type="search"
        defaultValue={defaultValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Buscar aprovação..."
        aria-label="Buscar aprovações"
        autoComplete="off"
        className="h-9 w-64 rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  )
}
