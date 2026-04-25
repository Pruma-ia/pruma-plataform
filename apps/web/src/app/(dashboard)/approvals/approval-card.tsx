"use client"

import { useState } from "react"
import { CheckCircle, XCircle, Clock, Paperclip, ExternalLink, Loader2 } from "lucide-react"

type DecisionOption = { id: string; label: string }
type DecisionField = { id: string; type: "select"; label: string; options: DecisionOption[] }

type Approval = {
  id: string
  title: string
  description?: string | null
  context?: unknown
  status: string
  expiresAt?: Date | null
  createdAt: Date
  resolvedAt?: Date | null
  resolvedByName?: string | null
  flowId?: string | null
  decisionFields?: unknown
  decisionValues?: unknown
}

type FileItem = { id: string; filename: string; mimeType: string; sizeBytes: number; url: string }

export function ApprovalCard({
  approval,
  canResolve,
  fileCount,
}: {
  approval: Approval
  canResolve: boolean
  fileCount: number
}) {
  const [comment, setComment] = useState("")
  const [decisionValues, setDecisionValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null)
  const [resolved, setResolved] = useState(false)
  const [files, setFiles] = useState<FileItem[] | null>(null)
  const [loadingFiles, setLoadingFiles] = useState(false)

  const decisionFields = Array.isArray(approval.decisionFields)
    ? (approval.decisionFields as DecisionField[])
    : []

  async function loadFiles() {
    if (files !== null) return
    setLoadingFiles(true)
    const res = await fetch(`/api/approvals/${approval.id}/files`)
    const data = await res.json()
    setFiles(data.files ?? [])
    setLoadingFiles(false)
  }

  async function resolve(action: "approve" | "reject") {
    if (action === "reject" && !comment.trim()) {
      alert("Informe o motivo da rejeição")
      return
    }
    setLoading(action)
    await fetch(`/api/approvals/${approval.id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment, decisionValues }),
    })
    setLoading(null)
    setResolved(true)
  }

  const statusIcons: Record<string, React.ReactNode> = {
    approved: <CheckCircle className="h-4 w-4 text-[#00AEEF]" />,
    rejected: <XCircle className="h-4 w-4 text-red-600" />,
    pending: <Clock className="h-4 w-4 text-[#162460]" />,
  }

  const statusColors: Record<string, string> = {
    approved: "border-[#5CCFF5]/40 bg-[#E0F6FE]/50",
    rejected: "border-red-200 bg-red-50/50",
    pending: "border-[#5CCFF5]/30 bg-[#E0F6FE]/30",
  }

  const status = resolved ? "approved" : approval.status

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className={`rounded-xl border p-5 shadow-sm ${statusColors[status] ?? "bg-card"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {statusIcons[status]}
            <h3 className="font-semibold">{approval.title}</h3>
            {fileCount > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-[#E0F6FE] px-2 py-0.5 text-xs text-[#00AEEF]">
                <Paperclip className="h-3 w-3" />
                {fileCount}
              </span>
            )}
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
          {approval.resolvedAt && (
            <p className="mt-1 text-xs text-muted-foreground">
              Resolvido em {new Date(approval.resolvedAt).toLocaleString("pt-BR")}
              {approval.resolvedByName && ` por ${approval.resolvedByName}`}
            </p>
          )}
        </div>
      </div>

      {/* Arquivos anexados */}
      {fileCount > 0 && (
        <div className="mt-3">
          {files === null ? (
            <button
              onClick={loadFiles}
              disabled={loadingFiles}
              className="flex items-center gap-1.5 text-xs text-[#00AEEF] hover:underline disabled:opacity-50"
            >
              {loadingFiles ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
              {loadingFiles ? "Carregando arquivos..." : `Ver ${fileCount} arquivo(s) anexado(s)`}
            </button>
          ) : (
            <div className="space-y-1.5">
              {files.map((f) => (
                <a
                  key={f.id}
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate">{f.filename}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{formatBytes(f.sizeBytes)}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {canResolve && !resolved && (
        <div className="mt-4 space-y-3">
          {/* Campos de decisão configurados pelo n8n */}
          {decisionFields.map((field) => (
            <div key={field.id}>
              <label className="mb-1 block text-sm font-medium">{field.label}</label>
              <select
                value={decisionValues[field.id] ?? ""}
                onChange={(e) =>
                  setDecisionValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                }
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione...</option>
                {field.options.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}

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
              className="flex items-center gap-1.5 rounded-lg bg-[#00AEEF] px-4 py-2 text-sm font-medium text-white hover:bg-[#00AEEF]/90 disabled:opacity-50 transition-colors"
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
        <p className="mt-3 text-sm font-medium text-[#00AEEF]">Aprovação registrada com sucesso.</p>
      )}
    </div>
  )
}
