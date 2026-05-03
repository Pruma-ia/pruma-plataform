"use client"

import { useState } from "react"
import { CheckCircle2, Circle, ExternalLink, ListChecks } from "lucide-react"
import { Button } from "@/components/ui/button"

interface OnboardingChecklistProps {
  whatsappClicked: boolean
  processConfigured: boolean
  firstApproval: boolean
  whatsappLink: string
}

export function OnboardingChecklist({
  whatsappClicked,
  processConfigured,
  firstApproval,
  whatsappLink,
}: OnboardingChecklistProps) {
  const [localWhatsappClicked, setLocalWhatsappClicked] = useState(whatsappClicked)
  const completedCount = [localWhatsappClicked, processConfigured, firstApproval].filter(Boolean).length

  const handleClick = () => {
    window.open(whatsappLink, "_blank", "noopener,noreferrer")
    setLocalWhatsappClicked(true)
    fetch("/api/onboarding/whatsapp-clicked", { method: "POST" }).catch(() => {
      // fire-and-forget; no UI error per UI-SPEC
    })
  }

  return (
    <section className="rounded-xl border bg-card shadow-sm" aria-labelledby="onboarding-title">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-6 py-4">
        <ListChecks className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h2 id="onboarding-title" className="font-semibold text-base font-heading">
          Primeiros passos
        </h2>
        <span className="ml-auto text-sm text-muted-foreground">
          {completedCount} de 3 concluídos
        </span>
      </div>

      {/* Items */}
      <ul role="list" className="divide-y">
        {/* Item 1 — Agendar suporte */}
        <li role="listitem" className="flex items-start gap-4 px-6 py-4">
          <div className="mt-0.5 shrink-0">
            {localWhatsappClicked ? (
              <CheckCircle2 className="h-5 w-5 text-[#00AEEF] animate-in zoom-in-50 duration-300" aria-hidden="true" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground/40" aria-hidden="true" />
            )}
          </div>
          <div className="flex-1">
            <p className={localWhatsappClicked ? "text-sm text-muted-foreground line-through transition-all duration-300" : "text-sm font-normal"}>
              Agendar suporte com a Pruma
            </p>
          </div>
          {!localWhatsappClicked && (
            <Button
              variant="secondary"
              size="sm"
              aria-label="Agendar suporte com a Pruma — abre WhatsApp"
              onClick={handleClick}
            >
              Falar com suporte
              <ExternalLink className="ml-1 h-3 w-3" aria-hidden="true" />
            </Button>
          )}
        </li>

        {/* Item 2 — Processo configurado */}
        <li role="listitem" className="flex items-start gap-4 px-6 py-4">
          <div className="mt-0.5 shrink-0">
            {processConfigured ? (
              <CheckCircle2 className="h-5 w-5 text-[#00AEEF]" aria-hidden="true" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground/40" aria-hidden="true" />
            )}
          </div>
          <div className="flex-1">
            <p className={processConfigured ? "text-sm text-muted-foreground line-through" : "text-sm font-normal"}>
              Processo configurado pela Pruma
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Nossa equipe irá configurar seus fluxos de aprovação.
            </p>
          </div>
        </li>

        {/* Item 3 — Primeira aprovação recebida */}
        <li role="listitem" className="flex items-start gap-4 px-6 py-4">
          <div className="mt-0.5 shrink-0">
            {firstApproval ? (
              <CheckCircle2 className="h-5 w-5 text-[#00AEEF]" aria-hidden="true" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground/40" aria-hidden="true" />
            )}
          </div>
          <div className="flex-1">
            <p className={firstApproval ? "text-sm text-muted-foreground line-through" : "text-sm font-normal"}>
              Primeira aprovação recebida
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Aguardando a primeira aprovação do seu processo.
            </p>
          </div>
        </li>
      </ul>
    </section>
  )
}
