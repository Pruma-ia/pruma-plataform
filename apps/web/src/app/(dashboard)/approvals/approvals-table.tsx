import Link from "next/link"
import {
  CheckCircle,
  XCircle,
  Clock,
  Paperclip,
  ChevronRight,
  Download,
  Search,
  ClipboardList,
} from "lucide-react"

// ── Status display maps (copied verbatim from old approvals-list.tsx) ─────────

const STATUS_ICON: Record<string, React.ReactNode> = {
  approved: <CheckCircle className="h-4 w-4 text-[#00AEEF]" />,
  rejected: <XCircle className="h-4 w-4 text-red-400" />,
  pending: <Clock className="h-4 w-4 text-amber-500 dark:text-amber-400" />,
}

const STATUS_LABEL: Record<string, string> = {
  approved: "Aprovada",
  rejected: "Rejeitada",
  pending: "Pendente",
}

const STATUS_BADGE: Record<string, string> = {
  approved: "bg-[#E0F6FE] text-[#00AEEF] dark:bg-[#00AEEF]/15 dark:text-[#5CCFF5]",
  rejected: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400",
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApprovalRow {
  id: string
  title: string
  description?: string | null
  status: string
  createdAt: Date
  resolvedAt?: Date | null
  resolvedByName?: string | null
  flowName?: string | null
  expiresAt?: Date | null
}

interface ApprovalsTableProps {
  approvals: ApprovalRow[]
  fileCounts: Record<string, number>
  totalPages: number
  currentPage: number
  totalCount: number
  pageSize: number
  currentSearchParams: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ApprovalsTable({
  approvals: rows,
  fileCounts,
  totalPages,
  currentPage,
  totalCount,
  pageSize,
  currentSearchParams,
}: ApprovalsTableProps) {
  // Build pagination hrefs by swapping ?page=
  function buildPageHref(page: number): string {
    const params = new URLSearchParams(currentSearchParams)
    params.set("page", String(page))
    return `/approvals?${params.toString()}`
  }

  const prevHref = buildPageHref(currentPage - 1)
  const nextHref = buildPageHref(currentPage + 1)
  const showFrom = (currentPage - 1) * pageSize + 1
  const showTo = Math.min(currentPage * pageSize, totalCount)

  // Empty state: distinguish filtered-empty vs no approvals at all
  if (rows.length === 0) {
    const hasFilters =
      currentSearchParams.includes("status=") ||
      currentSearchParams.includes("flowId=") ||
      currentSearchParams.includes("dateFrom=") ||
      currentSearchParams.includes("dateTo=") ||
      currentSearchParams.includes("q=")

    if (hasFilters) {
      return (
        <div className="rounded-xl border border-border bg-card p-12 text-center flex flex-col items-center gap-3">
          <Search className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">Nenhum resultado</p>
          <p className="text-xs text-muted-foreground">
            Tente ajustar os filtros ou limpar a busca.
          </p>
          <a
            href="/approvals"
            className="mt-1 inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors"
          >
            Limpar filtros
          </a>
        </div>
      )
    }

    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center flex flex-col items-center gap-3">
        <ClipboardList className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">
          Nenhuma aprovação recebida ainda
        </p>
        <p className="text-xs text-muted-foreground">
          Quando o n8n criar aprovações via webhook elas aparecerão aqui.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground w-8" />
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Título</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
              Fluxo
            </th>
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
          {rows.map((a) => {
            const fileCount = fileCounts[a.id] ?? 0
            return (
              <tr
                key={a.id}
                className="border-b border-border/50 last:border-b-0 transition-colors hover:bg-muted/40"
              >
                <td className="px-4 py-4">{STATUS_ICON[a.status]}</td>
                <td className="px-4 py-4">
                  <Link href={`/approvals/${a.id}`} className="block group">
                    <span className="font-medium group-hover:text-[#00AEEF] transition-colors">
                      {a.title}
                    </span>
                    {a.description && (
                      <span className="block text-xs text-muted-foreground truncate max-w-xs mt-0.5">
                        {a.description}
                      </span>
                    )}
                  </Link>
                </td>
                <td className="px-4 py-4 text-xs text-muted-foreground hidden md:table-cell">
                  {a.flowName ?? <span className="text-muted-foreground/40">—</span>}
                </td>
                <td className="px-4 py-4 text-xs text-muted-foreground hidden md:table-cell whitespace-nowrap tabular-nums">
                  {new Date(a.createdAt).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-4 text-xs text-muted-foreground hidden lg:table-cell whitespace-nowrap">
                  {a.resolvedAt ? (
                    <span>
                      {new Date(a.resolvedAt).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {a.resolvedByName && <span> · {a.resolvedByName}</span>}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  {fileCount > 0 && (
                    <span className="flex items-center gap-1 text-xs text-[#00AEEF]/70">
                      <Paperclip className="h-3 w-3" />
                      {fileCount}
                    </span>
                  )}
                </td>
                <td className="px-4 py-4 text-right">
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
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[a.status]}`}
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

      {/* Pagination footer */}
      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <span className="text-xs text-muted-foreground tabular-nums">
          Mostrando {showFrom}–{showTo} de {totalCount} aprovações
        </span>
        <div className="flex items-center gap-1">
          <a
            aria-label="Página anterior"
            href={prevHref}
            className={`inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/40 ${
              currentPage <= 1 ? "pointer-events-none opacity-50" : ""
            }`}
          >
            Anterior
          </a>
          <a
            aria-label="Próxima página"
            href={nextHref}
            className={`inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/40 ${
              currentPage >= totalPages ? "pointer-events-none opacity-50" : ""
            }`}
          >
            Próxima
          </a>
        </div>
      </div>

      {/* Export CSV link */}
      <div className="border-t border-border px-4 py-3 flex justify-end">
        <a
          href={`/api/approvals/export?${currentSearchParams}`}
          download
          className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Exportar CSV
        </a>
      </div>
    </div>
  )
}
