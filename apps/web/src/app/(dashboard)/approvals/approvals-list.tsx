"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCircle, XCircle, Clock, Paperclip, ChevronRight } from "lucide-react"

type Approval = {
  id: string
  title: string
  description?: string | null
  status: string
  createdAt: Date
  resolvedAt?: Date | null
  resolvedByName?: string | null
  expiresAt?: Date | null
}

type Filter = "all" | "pending" | "approved" | "rejected"

const STATUS_ICON: Record<string, React.ReactNode> = {
  approved: <CheckCircle className="h-4 w-4 text-[#00AEEF]" />,
  rejected: <XCircle className="h-4 w-4 text-red-500" />,
  pending: <Clock className="h-4 w-4 text-[#162460]" />,
}

const STATUS_LABEL: Record<string, string> = {
  approved: "Aprovada",
  rejected: "Rejeitada",
  pending: "Pendente",
}

const STATUS_BADGE: Record<string, string> = {
  approved: "bg-[#E0F6FE] text-[#00AEEF]",
  rejected: "bg-red-50 text-red-600",
  pending: "bg-[#0D1B4B]/10 text-[#0D1B4B]",
}

export function ApprovalsList({
  approvals,
  fileCounts,
}: {
  approvals: Approval[]
  fileCounts: Record<string, number>
}) {
  const [filter, setFilter] = useState<Filter>("pending")

  const total = approvals.length
  const pendingCount = approvals.filter((a) => a.status === "pending").length
  const approvedCount = approvals.filter((a) => a.status === "approved").length
  const rejectedCount = approvals.filter((a) => a.status === "rejected").length

  const filtered =
    filter === "all" ? approvals : approvals.filter((a) => a.status === filter)

  const stats: { label: string; value: number; color: string; bg: string; filter: Filter }[] = [
    { label: "Total", value: total, color: "text-[#0D1B4B]", bg: "bg-[#0D1B4B]/5", filter: "all" },
    { label: "Pendentes", value: pendingCount, color: "text-[#0D1B4B]", bg: "bg-[#0D1B4B]/10", filter: "pending" },
    { label: "Aprovadas", value: approvedCount, color: "text-[#00AEEF]", bg: "bg-[#E0F6FE]", filter: "approved" },
    { label: "Rejeitadas", value: rejectedCount, color: "text-red-600", bg: "bg-red-50", filter: "rejected" },
  ]

  const tabs: { label: string; value: Filter; count: number }[] = [
    { label: "Todas", value: "all", count: total },
    { label: "Pendentes", value: "pending", count: pendingCount },
    { label: "Aprovadas", value: "approved", count: approvedCount },
    { label: "Rejeitadas", value: "rejected", count: rejectedCount },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <button
            key={s.filter}
            onClick={() => setFilter(s.filter)}
            className={`rounded-xl border p-4 text-left transition-all hover:shadow-md ${
              filter === s.filter ? "ring-2 ring-[#00AEEF] shadow-md" : "shadow-sm"
            } ${s.bg}`}
          >
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              {s.label}
            </p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </button>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setFilter(t.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === t.value
                ? "border-[#00AEEF] text-[#00AEEF]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span
                className={`ml-2 rounded-full px-1.5 py-0.5 text-xs ${
                  filter === t.value
                    ? "bg-[#E0F6FE] text-[#00AEEF]"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center shadow-sm">
          <p className="text-muted-foreground">Nenhuma aprovação encontrada.</p>
        </div>
      ) : (
        <div className="rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-8" />
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Título</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
                  Data
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                  Resolvido
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-10" />
                <th className="px-4 py-3 text-right font-medium text-muted-foreground w-28" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => {
                const fileCount = fileCounts[a.id] ?? 0
                return (
                  <tr
                    key={a.id}
                    className={`border-b last:border-b-0 transition-colors hover:bg-muted/30 ${
                      i % 2 === 0 ? "" : "bg-muted/10"
                    }`}
                  >
                    <td className="px-4 py-3">{STATUS_ICON[a.status]}</td>
                    <td className="px-4 py-3">
                      <Link href={`/approvals/${a.id}`} className="block group">
                        <span className="font-medium group-hover:text-[#00AEEF] transition-colors">
                          {a.title}
                        </span>
                        {a.description && (
                          <span className="block text-xs text-muted-foreground truncate max-w-xs">
                            {a.description}
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell whitespace-nowrap">
                      {new Date(a.createdAt).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell whitespace-nowrap">
                      {a.resolvedAt ? (
                        <span>
                          {new Date(a.resolvedAt).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {a.resolvedByName && (
                            <span className="text-xs"> · {a.resolvedByName}</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {fileCount > 0 && (
                        <span className="flex items-center gap-1 text-xs text-[#00AEEF]">
                          <Paperclip className="h-3 w-3" />
                          {fileCount}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {a.status === "pending" ? (
                        <Link
                          href={`/approvals/${a.id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#00AEEF] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#00AEEF]/90 transition-colors"
                        >
                          Analisar
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[a.status]}`}
                        >
                          {STATUS_LABEL[a.status]}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
