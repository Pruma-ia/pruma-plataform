"use client"

import { useState } from "react"
import { CheckCircle, XCircle, Clock } from "lucide-react"

type Approval = {
  id: string
  title: string
  description?: string | null
  context?: unknown
  status: string
  expiresAt?: Date | null
  createdAt: Date
  flowId?: string | null
}

export function ApprovalCard({
  approval,
  canResolve,
}: {
  approval: Approval
  canResolve: boolean
}) {
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null)
  const [resolved, setResolved] = useState(false)

  async function resolve(action: "approve" | "reject") {
    if (action === "reject" && !comment.trim()) {
      alert("Informe o motivo da rejeição")
      return
    }
    setLoading(action)
    await fetch(`/api/approvals/${approval.id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment }),
    })
    setLoading(null)
    setResolved(true)
  }

  const statusIcons: Record<string, React.ReactNode> = {
    approved: <CheckCircle className="h-4 w-4 text-green-600" />,
    rejected: <XCircle className="h-4 w-4 text-red-600" />,
    pending: <Clock className="h-4 w-4 text-amber-600" />,
  }

  const statusColors: Record<string, string> = {
    approved: "border-green-200 bg-green-50/50",
    rejected: "border-red-200 bg-red-50/50",
    pending: "border-amber-200 bg-amber-50/50",
  }

  const status = resolved ? "approved" : approval.status

  return (
    <div className={`rounded-xl border p-5 shadow-sm ${statusColors[status] ?? "bg-card"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {statusIcons[status]}
            <h3 className="font-semibold">{approval.title}</h3>
          </div>
          {approval.description && (
            <p className="mt-1 text-sm text-muted-foreground">{approval.description}</p>
          )}
          {approval.context != null && (
            <details className="mt-2">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                Ver contexto
              </summary>
              <pre className="mt-1 rounded bg-muted p-2 text-xs overflow-auto max-h-32">
                {JSON.stringify(approval.context, null, 2)}
              </pre>
            </details>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {new Date(approval.createdAt).toLocaleString("pt-BR")}
            {approval.expiresAt && ` · Expira ${new Date(approval.expiresAt).toLocaleString("pt-BR")}`}
          </p>
        </div>
      </div>

      {canResolve && !resolved && (
        <div className="mt-4 space-y-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Comentário (obrigatório para rejeição)"
            rows={2}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-2">
            <button
              onClick={() => resolve("approve")}
              disabled={!!loading}
              className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <CheckCircle className="h-4 w-4" />
              {loading === "approve" ? "Aprovando..." : "Aprovar"}
            </button>
            <button
              onClick={() => resolve("reject")}
              disabled={!!loading}
              className="flex items-center gap-1.5 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              <XCircle className="h-4 w-4" />
              {loading === "reject" ? "Rejeitando..." : "Rejeitar"}
            </button>
          </div>
        </div>
      )}

      {resolved && (
        <p className="mt-3 text-sm font-medium text-green-700">Aprovação registrada com sucesso.</p>
      )}
    </div>
  )
}
