"use client"

import { useState } from "react"

interface Props {
  orgId: string
  currentStatus: string | null
}

export function SetupChargeForm({ orgId, currentStatus }: Props) {
  const [amount, setAmount] = useState("")
  const [installments, setInstallments] = useState("1")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amountNum = parseInt(amount.replace(/\D/g, ""), 10)
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
      <p className="text-sm text-green-700 bg-green-50 rounded-lg px-4 py-3 border border-green-200">
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
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-[#00AEEF] focus:ring-2 focus:ring-[#00AEEF]/20"
            placeholder="2000"
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
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-[#00AEEF] focus:ring-2 focus:ring-[#00AEEF]/20"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}x
                {amount && parseInt(amount) > 0
                  ? ` de R$ ${Math.ceil((parseInt(amount) / n) * 100) / 100}`
                  : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[#00AEEF] px-4 py-2 text-sm font-medium text-white hover:bg-[#0097d1] disabled:opacity-60 transition-colors"
        >
          {loading ? "Salvando..." : "Criar cobrança de setup"}
        </button>

        {currentStatus === "pending" && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60 transition-colors"
          >
            Cancelar cobrança
          </button>
        )}
      </div>
    </form>
  )
}
