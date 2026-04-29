"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, AlertTriangle } from "lucide-react"

interface Props {
  setupCharge: { amount: number; installments: number } | null
  profileIncomplete: boolean
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function formatCardNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim()
}

const inputCls =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
const labelCls = "mb-1 block text-xs font-medium text-muted-foreground"

export function CheckoutForm({ setupCharge, profileIncomplete }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<"form" | "loading" | "success" | "error">("form")
  const [error, setError] = useState<string | null>(null)
  const [holderName, setHolderName] = useState("")
  const [cardNumber, setCardNumber] = useState("")
  const [expiryMonth, setExpiryMonth] = useState("")
  const [expiryYear, setExpiryYear] = useState("")
  const [ccv, setCcv] = useState("")

  async function submit() {
    const rawCard = cardNumber.replace(/\s/g, "")
    if (!holderName.trim() || rawCard.length < 16 || !expiryMonth || !expiryYear || !ccv) {
      setError("Preencha todos os dados do cartão corretamente.")
      setStep("error")
      return
    }

    setStep("loading")
    setError(null)

    try {
      const res = await fetch("/api/billing/unified-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creditCard: { holderName, number: rawCard, expiryMonth, expiryYear, ccv },
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        const msg =
          typeof data?.error === "string"
            ? data.error
            : data?.error?.message ?? "Erro ao processar. Tente novamente."
        setError(msg)
        setStep("error")
        return
      }

      setStep("success")
    } catch {
      setError("Falha de conexão. Verifique sua internet e tente novamente.")
      setStep("error")
    }
  }

  if (step === "success") {
    return (
      <div className="rounded-xl border bg-card p-10 shadow-sm flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
          <Check className="h-7 w-7 text-accent" aria-hidden="true" />
        </div>
        <div>
          <p className="text-lg font-semibold text-primary">Bem-vindo à Pruma IA!</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {setupCharge ? "Setup e assinatura ativados." : "Assinatura ativada."} Redirecionando...
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="mt-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Ir para o dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Perfil incompleto */}
      {profileIncomplete && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-amber-800">Cadastro incompleto</p>
            <p className="text-sm text-amber-700 mt-0.5">
              CNPJ e endereço são necessários para contratar.{" "}
              <a href="/settings/organization" className="underline font-medium hover:text-amber-900 transition-colors">
                Completar dados
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Resumo do pedido */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Resumo do pedido</p>
        </div>

        <div className="divide-y divide-border">
          {setupCharge && (
            <div className="px-6 py-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Setup inicial</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Diagnóstico · Construção · Validação · Operação Fluida
                </p>
                {setupCharge.installments > 1 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    em {setupCharge.installments}x no cartão · cobrança única
                  </p>
                )}
              </div>
              <p className="text-sm font-semibold text-primary shrink-0">{formatBRL(setupCharge.amount)}</p>
            </div>
          )}

          <div className="px-6 py-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Plano Pro</p>
              <p className="text-xs text-muted-foreground mt-0.5">cobrado mensalmente · cancele quando quiser</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground line-through">R$ 1.499/mês</p>
              <p className="text-sm font-semibold text-primary">R$ 990/mês</p>
            </div>
          </div>
        </div>
      </div>

      {/* Formulário do cartão */}
      {!profileIncomplete && (
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <p className="text-sm font-semibold">Dados do cartão</p>

          <div>
            <label htmlFor="co-holderName" className={labelCls}>
              Nome no cartão <span aria-hidden className="text-destructive">*</span>
            </label>
            <input
              id="co-holderName"
              type="text"
              autoComplete="cc-name"
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              className={inputCls}
              placeholder="JOÃO A SILVA"
              disabled={step === "loading"}
            />
          </div>

          <div>
            <label htmlFor="co-cardNumber" className={labelCls}>
              Número do cartão <span aria-hidden className="text-destructive">*</span>
            </label>
            <input
              id="co-cardNumber"
              type="text"
              autoComplete="cc-number"
              inputMode="numeric"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              className={inputCls}
              placeholder="0000 0000 0000 0000"
              maxLength={19}
              disabled={step === "loading"}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="co-expiryMonth" className={labelCls}>
                Mês <span aria-hidden className="text-destructive">*</span>
              </label>
              <input
                id="co-expiryMonth"
                type="text"
                autoComplete="cc-exp-month"
                inputMode="numeric"
                value={expiryMonth}
                onChange={(e) => setExpiryMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
                className={inputCls}
                placeholder="MM"
                maxLength={2}
                disabled={step === "loading"}
              />
            </div>
            <div>
              <label htmlFor="co-expiryYear" className={labelCls}>
                Ano <span aria-hidden className="text-destructive">*</span>
              </label>
              <input
                id="co-expiryYear"
                type="text"
                autoComplete="cc-exp-year"
                inputMode="numeric"
                value={expiryYear}
                onChange={(e) => setExpiryYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className={inputCls}
                placeholder="AAAA"
                maxLength={4}
                disabled={step === "loading"}
              />
            </div>
            <div>
              <label htmlFor="co-ccv" className={labelCls}>
                CVV <span aria-hidden className="text-destructive">*</span>
              </label>
              <input
                id="co-ccv"
                type="text"
                autoComplete="cc-csc"
                inputMode="numeric"
                value={ccv}
                onChange={(e) => setCcv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className={inputCls}
                placeholder="000"
                maxLength={4}
                disabled={step === "loading"}
              />
            </div>
          </div>

          {(step === "error") && error && (
            <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={step === "error" ? () => { setStep("form"); setError(null) } : submit}
            disabled={step === "loading"}
            className="w-full rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring outline-none inline-flex items-center justify-center gap-2"
          >
            {step === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Processando...
              </>
            ) : step === "error" ? (
              "Tentar novamente"
            ) : (
              "Confirmar e contratar"
            )}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            Sem fidelidade · Cancele quando quiser
          </p>
        </div>
      )}
    </div>
  )
}
