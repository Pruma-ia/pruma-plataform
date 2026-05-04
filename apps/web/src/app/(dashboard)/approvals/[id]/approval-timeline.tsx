import { Plus, Eye, CheckCircle, XCircle } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApprovalEvent {
  id: string
  eventType: string
  actorType: string
  actorId: string | null
  actorName: string | null
  // Drizzle returns jsonb as unknown; helpers cast narrowly before access
  metadata: unknown
  createdAt: Date
}

interface Props {
  events: ApprovalEvent[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EVENT_LABEL: Record<string, string> = {
  approval_created: "Aprovação criada",
  approval_viewed: "Aprovação visualizada",
  approval_resolved: "Resolvido",
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getEventIcon(event: ApprovalEvent) {
  if (event.eventType === "approval_created") {
    return <Plus className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
  }
  if (event.eventType === "approval_viewed") {
    return <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
  }
  if (event.eventType === "approval_resolved") {
    const isApproved = (event.metadata as { status?: string } | null)?.status === "approved"
    if (isApproved) {
      return <CheckCircle className="h-4 w-4 text-[#00AEEF]" aria-hidden="true" />
    }
    return <XCircle className="h-4 w-4 text-red-500" aria-hidden="true" />
  }
  return <Plus className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
}

function getActorLabel(event: ApprovalEvent): string {
  if (event.actorType === "system") return "Sistema"
  return event.actorName ?? "Usuário desconhecido"
}

function getResolvedLabel(event: ApprovalEvent): string {
  if (event.eventType === "approval_resolved") {
    const status = (event.metadata as { status?: string } | null)?.status
    if (status === "approved") return "Aprovado"
    if (status === "rejected") return "Rejeitado"
  }
  return EVENT_LABEL[event.eventType] ?? event.eventType
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ApprovalTimeline({ events }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="border-b border-border px-5 py-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Histórico de decisão
        </p>
      </div>

      {/* Content */}
      {events.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">
          Nenhum evento registrado.
        </p>
      ) : (
        <ol>
          {events.map((event) => {
            const comment = (event.metadata as { comment?: string } | null)?.comment
            return (
              <li
                key={event.id}
                className="flex items-start gap-2 px-5 py-4 border-b border-border last:border-b-0"
              >
                <div className="shrink-0 mt-0.5">
                  {getEventIcon(event)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {getResolvedLabel(event)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {getActorLabel(event)}
                    {" · "}
                    {new Date(event.createdAt).toLocaleString("pt-BR")}
                  </p>
                  {comment && (
                    <p className="mt-1 text-xs text-muted-foreground italic line-clamp-3">
                      {comment}
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
