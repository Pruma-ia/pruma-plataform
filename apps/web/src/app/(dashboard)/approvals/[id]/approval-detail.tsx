"use client"

import { useState, useEffect } from "react"
import {
  CheckCircle,
  XCircle,
  Clock,
  Paperclip,
  ExternalLink,
  Loader2,
} from "lucide-react"

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
  decisionFields?: unknown
  decisionValues?: unknown
}

type FileItem = {
  id: string
  filename: string
  mimeType: string
  sizeBytes: number
  url: string
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ApprovalDetail({
  approval,
  fileCount,
  canResolve,
}: {
  approval: Approval
  fileCount: number
  canResolve: boolean
}) {
  const [comment, setComment] = useState("")
  const [decisionValues, setDecisionValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null)
  const [resolved, setResolved] = useState(false)
  const [files, setFiles] = useState<FileItem[] | null>(null)
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)
  const [pdfStatus, setPdfStatus] = useState<Record<string, "checking" | "ok" | "error">>({})
  const [imgError, setImgError] = useState<Record<string, boolean>>({})

  const decisionFields = Array.isArray(approval.decisionFields)
    ? (approval.decisionFields as DecisionField[])
    : []

  const status = resolved ? "approved" : approval.status

  useEffect(() => {
    if (fileCount > 0) loadFiles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadFiles() {
    setLoadingFiles(true)
    const res = await fetch(`/api/approvals/${approval.id}/files`)
    const data = await res.json()
    const list: FileItem[] = data.files ?? []
    setFiles(list)
    setLoadingFiles(false)
    if (list.length > 0) {
      selectFile(list[0])
    }
  }

  function selectFile(f: FileItem) {
    setSelectedFile(f)
    if (f.mimeType === "application/pdf") checkPdf(f.id)
  }

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

  const statusIcon = {
    approved: <CheckCircle className="h-5 w-5 text-[#00AEEF]" />,
    rejected: <XCircle className="h-5 w-5 text-red-500" />,
    pending: <Clock className="h-5 w-5 text-[#0D1B4B]" />,
  }[status] ?? <Clock className="h-5 w-5 text-[#0D1B4B]" />

  const statusBorderLeft: Record<string, string> = {
    approved: "border-l-[#00AEEF]",
    rejected: "border-l-red-500",
    pending: "border-l-[#0D1B4B]",
  }

  const headerCard = (
    <div className={`rounded-xl border-l-4 border bg-card shadow-sm p-5 ${statusBorderLeft[status] ?? "border-l-[#0D1B4B]"}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{statusIcon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-lg leading-tight">{approval.title}</h2>
            {fileCount > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-[#E0F6FE] px-2 py-0.5 text-xs text-[#00AEEF]">
                <Paperclip className="h-3 w-3" />
                {fileCount}
              </span>
            )}
          </div>
          {approval.description && (
            <p className="mt-1.5 text-sm text-muted-foreground">{approval.description}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
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
  )

  const decisionPanel = (
    <div className="rounded-xl border bg-[#0D1B4B]/[0.03] shadow-sm p-5">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Decisão
      </h3>
      {resolved ? (
        <div className="flex items-center gap-2 rounded-lg bg-[#E0F6FE] px-4 py-3">
          <CheckCircle className="h-4 w-4 text-[#00AEEF] shrink-0" />
          <p className="text-sm font-medium text-[#00AEEF]">
            Aprovação registrada com sucesso.
          </p>
        </div>
      ) : !canResolve ? (
        <p className="text-sm text-muted-foreground">Esta aprovação já foi resolvida.</p>
      ) : (
        <div className="space-y-4">
          {decisionFields.map((field) => (
            <div key={field.id}>
              <label className="mb-1.5 block text-sm font-medium">{field.label}</label>
              <select
                value={decisionValues[field.id] ?? ""}
                onChange={(e) =>
                  setDecisionValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                }
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF]"
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
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Comentário
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                (obrigatório para rejeição)
              </span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Adicione um comentário..."
              rows={5}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#00AEEF]"
            />
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={() => resolve("approve")}
              disabled={!!loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#00AEEF] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#00AEEF]/90 disabled:opacity-50 transition-colors"
            >
              <CheckCircle className="h-4 w-4" />
              {loading === "approve" ? "Aprovando..." : "Aprovar"}
            </button>
            <button
              onClick={() => resolve("reject")}
              disabled={!!loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-300 px-5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              <XCircle className="h-4 w-4" />
              {loading === "reject" ? "Rejeitando..." : "Rejeitar"}
            </button>
          </div>
        </div>
      )}
    </div>
  )

  if (fileCount === 0) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col gap-4">
        {headerCard}
        {decisionPanel}
      </div>
    )
  }

  return (
    <div className="flex flex-col xl:flex-row gap-6 items-start">
      {/* LEFT: Info + File viewer */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        {headerCard}

        {/* File viewer */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col">
          {loadingFiles && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {files && files.length > 0 && (
            <>
              {/* File tab bar */}
              <div className="flex items-center gap-1 border-b px-2 overflow-x-auto">
                {files.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => selectFile(f)}
                    className={`flex items-center gap-1.5 px-3 py-2.5 text-xs whitespace-nowrap border-b-2 transition-colors ${
                      selectedFile?.id === f.id
                        ? "border-[#00AEEF] text-[#00AEEF]"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Paperclip className="h-3 w-3 shrink-0" />
                    <span className="truncate max-w-[180px]">{f.filename}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{formatBytes(f.sizeBytes)}</span>
                  </button>
                ))}
                {selectedFile && (
                  <a
                    href={selectedFile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto p-2 text-muted-foreground hover:text-foreground shrink-0"
                    title="Abrir em nova aba"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>

              {/* Preview */}
              {selectedFile && (
                <div>
                  {selectedFile.mimeType.startsWith("image/") ? (
                    imgError[selectedFile.id] ? (
                      <div className="flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground">
                        <p>Não foi possível carregar o arquivo.</p>
                        <a
                          href={selectedFile.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[#00AEEF] hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Baixar arquivo
                        </a>
                      </div>
                    ) : (
                      <img
                        src={selectedFile.url}
                        alt={selectedFile.filename}
                        className="w-full object-contain max-h-[640px]"
                        onError={() => setImgError((p) => ({ ...p, [selectedFile.id]: true }))}
                      />
                    )
                  ) : selectedFile.mimeType === "application/pdf" ? (
                    <>
                      {!pdfStatus[selectedFile.id] || pdfStatus[selectedFile.id] === "checking" ? (
                        <div className="flex items-center justify-center py-16">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : pdfStatus[selectedFile.id] === "error" ? (
                        <div className="flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground">
                          <p>Não foi possível carregar o arquivo.</p>
                          <a
                            href={selectedFile.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[#00AEEF] hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Baixar arquivo
                          </a>
                        </div>
                      ) : (
                        <iframe
                          src={selectedFile.url}
                          className="w-full h-[640px]"
                          title={selectedFile.filename}
                        />
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground">
                      <p>Preview não disponível.</p>
                      <a
                        href={selectedFile.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#00AEEF] hover:underline"
                      >
                        Baixar arquivo
                      </a>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* RIGHT: Decision panel */}
      <div className="w-full xl:w-80 2xl:w-96 shrink-0 xl:sticky xl:top-6">
        {decisionPanel}
      </div>
    </div>
  )
}
