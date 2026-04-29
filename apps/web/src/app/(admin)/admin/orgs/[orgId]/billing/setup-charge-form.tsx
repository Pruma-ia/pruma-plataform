"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"

interface Props {
  orgId: string
  currentStatus: string | null
}

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

export function SetupChargeForm({ orgId, currentStatus }: Props) {
  const [amount, setAmount] = useState("")
  const [amountDisplay, setAmountDisplay] = useState("")
  const [installments, setInstallments] = useState("1")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "")
    setAmount(digits)
    const num = parseInt(digits, 10)
    setAmountDisplay(digits && num > 0 ? num.toLocaleString("pt-BR") : digits)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amountNum = parseInt(amount, 10)
    if (!amountNum || amountNum < 1) {
      setError("Informe um valor válido.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/admin/billing/setup-charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, amount: amountNum, installments: parseInt(installments) }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Erro ao criar cobrança.")
      } else {
        setSuccess(true)
        setTimeout(() => window.location.reload(), 1200)
      }
    } catch {
      setError("Falha de conexão.")
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel() {
    if (!confirm("Remover cobrança de setup desta organização?")) return
    setLoading(true)
    try {
      await fetch(`/api/admin/billing/setup-charge?orgId=${orgId}`, { method: "DELETE" })
      window.location.reload()
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-4 py-3 border border-emerald-200">
        Cobrança criada. O cliente verá o banner de pagamento.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="sc-amount" className="mb-1 block text-xs font-medium text-muted-foreground">
            Valor total (R$)
          </label>
          <input
            id="sc-amount"
            type="text"
            inputMode="numeric"
            value={amountDisplay}
            onChange={handleAmountChange}
            className={inputCls}
            placeholder="0"
          />
        </div>
        <div>
          <label htmlFor="sc-installments" className="mb-1 block text-xs font-medium text-muted-foreground">
            Parcelas (máx. 12)
          </label>
          <select
            id="sc-installments"
            value={installments}
            onChange={(e) => setInstallments(e.target.value)}
            className={inputCls}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}x</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive bg-destructive/5 rounded-lg px-3 py-2 border border-destructive/20">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring outline-none"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Salvando...
            </>
          ) : (
            "Criar cobrança de setup"
          )}
        </button>

        {currentStatus === "pending" && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring outline-none"
          >
            Cancelar cobrança
          </button>
        )}
      </div>
    </form>
  )
}
