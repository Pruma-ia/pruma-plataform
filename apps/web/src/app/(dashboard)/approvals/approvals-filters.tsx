"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback } from "react"

interface Flow {
  id: string
  name: string
}

interface Props {
  orgFlows: Flow[]
  defaultFlowId?: string
  defaultDateFrom?: string
  defaultDateTo?: string
}

export function ApprovalsFilters({ orgFlows, defaultFlowId, defaultDateFrom, defaultDateTo }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const pushParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      }
      params.set("page", "1")
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  return (
    <>
      <label htmlFor="flowId" className="sr-only">
        Fluxo
      </label>
      <select
        id="flowId"
        name="flowId"
        defaultValue={defaultFlowId ?? ""}
        onChange={(e) => pushParams({ flowId: e.target.value || undefined })}
        className="h-9 w-48 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="">Todos os fluxos</option>
        {orgFlows.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>

      <label htmlFor="dateFrom" className="sr-only">
        De
      </label>
      <input
        id="dateFrom"
        name="dateFrom"
        type="date"
        defaultValue={defaultDateFrom ?? ""}
        onChange={(e) => pushParams({ dateFrom: e.target.value || undefined })}
        className="h-9 w-36 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      <label htmlFor="dateTo" className="sr-only">
        Até
      </label>
      <input
        id="dateTo"
        name="dateTo"
        type="date"
        defaultValue={defaultDateTo ?? ""}
        onChange={(e) => pushParams({ dateTo: e.target.value || undefined })}
        className="h-9 w-36 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </>
  )
}
