"use client"

import { useState } from "react"
import { SetupChargeModal } from "./setup-charge-modal"

interface Props {
  amount: number
  installments: number
  profileIncomplete: boolean
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function SetupChargeBanner({ amount, installments, profileIncomplete }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="rounded-xl border border-accent/30 bg-secondary px-5 py-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Taxa de setup pendente</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {formatBRL(amount)}{installments > 1 && ` — ${installments}x`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring outline-none"
        >
          Pagar agora
        </button>
      </div>

      <SetupChargeModal
        amount={amount}
        installments={installments}
        isOpen={open}
        onClose={() => setOpen(false)}
        profileIncomplete={profileIncomplete}
      />
    </>
  )
}
