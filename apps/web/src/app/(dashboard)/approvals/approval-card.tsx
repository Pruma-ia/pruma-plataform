"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { CheckCircle, XCircle, Clock, Paperclip, ExternalLink, Loader2, ChevronDown, ChevronUp } from "lucide-react"

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
  href,
  autoLoadFiles,
}: {
  approval: Approval
  canResolve: boolean
  fileCount: number
  href?: string
  autoLoadFiles?: boolean
}) {
  const [comment, setComment] = useState("")
  const [decisionValues, setDecisionValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null)
  const [resolved, setResolved] = useState(false)
  const [files, setFiles] = useState<FileItem[] | null>(null)
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [previewFileId, setPreviewFileId] = useState<string | null>(null)
  const [pdfStatus, setPdfStatus] = useState<Record<string, "checking" | "ok" | "error">>({})

  const decisionFields = Array.isArray(approval.decisionFields)
    ? (approval.decisionFields as DecisionField[])
    : []

  async function checkPdf(fileId: string) {
    if (pdfStatus[fileId] === "ok" || pdfStatus[fileId] === "checking") return
    setPdfStatus((p) => ({ ...p, [fileId]: "checking" }))
    try {
      const res = await fetch(`/api/approvals/${approval.id}/files/${fileId}/check`)
      setPdfStatus((p) => ({ ...p, [fileId]: res.ok ? "ok" : "error" }))
    } catch {
      setPdfStatus((p) => ({ ...p, [fileId]: "error" }))
    }
  }

  async function loadFiles() {
    if (files !== null) return
    setLoadingFiles(true)
    const res = await fetch(`/api/approvals/${approval.id}/files`)
    const data = await res.json()
    setFiles(data.files ?? [])
    setLoadingFiles(false)
  }

  useEffect(() => {
    if (autoLoadFiles && fileCount > 0) loadFiles()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    <div className={`rounded-xl border shadow-sm ${statusColors[status] ?? "bg-card"}`}>
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">{statusIcons[status]}</div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {href ? (
                <Link href={href} className="font-semibold hover:underline leading-tight">
                  {approval.title}
                </Link>
              ) : (
                <h3 className="font-semibold leading-tight">{approval.title}</h3>
              )}
              {fileCount > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-[#E0F6FE] px-2 py-0.5 text-xs text-[#00AEEF] shrink-0">
                  <Paperclip className="h-3 w-3" />
                  {fileCount}
                </span>
              )}
            </div>

            {approval.description && (
              <p className="mt-1.5 text-sm text-muted-foreground">{approval.description}</p>
            )}

            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span>{new Date(approval.createdAt).toLocaleString("pt-BR")}</span>
              {approval.expiresAt && (
                <span>Expira {new Date(approval.expiresAt).toLocaleString("pt-BR")}</span>
              )}
              {approval.resolvedAt && (
                <span>
                  Resolvido em {new Date(approval.resolvedAt).toLocaleString("pt-BR")}
                  {approval.resolvedByName && ` por ${approval.resolvedByName}`}
                </span>
              )}
            </div>

            {approval.context != null && (
              <details className="mt-2">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground select-none">
                  Ver contexto
                </summary>
                <pre className="mt-1 rounded bg-muted p-2 text-xs overflow-auto max-h-32">
                  {JSON.stringify(approval.context, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      </div>

      {/* Arquivos anexados */}
      {fileCount > 0 && (
        <div className="border-t">
          {files === null ? (
            <div className="px-5 py-3">
              <button
                onClick={loadFiles}
                disabled={loadingFiles}
                className="flex items-center gap-1.5 text-xs text-[#00AEEF] hover:underline disabled:opacity-50"
              >
                {loadingFiles ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
                {loadingFiles ? "Carregando arquivos..." : `Ver ${fileCount} arquivo(s) anexado(s)`}
              </button>
            </div>
          ) : (
            <div className="divide-y">
              {files.map((f) => {
                const isOpen = previewFileId === f.id
                return (
                  <div key={f.id} className="overflow-hidden">
                    <button
                      onClick={() => {
                        const next = isOpen ? null : f.id
                        setPreviewFileId(next)
                        if (next && f.mimeType === "application/pdf") checkPdf(f.id)
                      }}
                      className="flex w-full items-center gap-2 px-5 py-3 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
                    >
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate">{f.filename}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{formatBytes(f.sizeBytes)}</span>
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground hover:text-foreground shrink-0"
                        title="Abrir em nova aba"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      {isOpen
                        ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                    </button>
                    {isOpen && (
                      <div className="border-t">
                        {f.mimeType.startsWith("image/") ? (
                          <img src={f.url} alt={f.filename} className="max-w-full" />
                        ) : f.mimeType === "application/pdf" ? (
                          <div className="flex flex-col">
                            {pdfStatus[f.id] === "checking" || pdfStatus[f.id] === undefined ? (
                              <div className="flex items-center justify-center py-10">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              </div>
                            ) : pdfStatus[f.id] === "error" ? (
                              <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
                                <p>Não foi possível carregar o arquivo.</p>
                                <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-[#00AEEF] hover:underline flex items-center gap-1">
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  Baixar arquivo
                                </a>
                              </div>
                            ) : (
                              <>
                                <iframe
                                  src={f.url}
                                  className="w-full h-[560px]"
                                  title={f.filename}
                                />
                                <div className="flex justify-end border-t px-3 py-2">
                                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                                    <ExternalLink className="h-3 w-3" />
                                    Abrir em nova aba
                                  </a>
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <p className="px-3 py-4 text-sm text-muted-foreground">
                            Preview não disponível.{" "}
                            <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-[#00AEEF] hover:underline">
                              Baixar arquivo
                            </a>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {canResolve && !resolved && (
        <div className="border-t px-5 py-4 space-y-3">
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
            rows={3}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-2">
            <button
              onClick={() => resolve("approve")}
              disabled={!!loading}
              className="flex items-center gap-2 rounded-lg bg-[#00AEEF] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#00AEEF]/90 disabled:opacity-50 transition-colors"
            >
              <CheckCircle className="h-4 w-4" />
              {loading === "approve" ? "Aprovando..." : "Aprovar"}
            </button>
            <button
              onClick={() => resolve("reject")}
              disabled={!!loading}
              className="flex items-center gap-2 rounded-lg border border-red-300 px-5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              <XCircle className="h-4 w-4" />
              {loading === "reject" ? "Rejeitando..." : "Rejeitar"}
            </button>
          </div>
        </div>
      )}

      {resolved && (
        <div className="border-t px-5 py-4">
          <p className="text-sm font-medium text-[#00AEEF]">Aprovação registrada com sucesso.</p>
        </div>
      )}
    </div>
  )
}
