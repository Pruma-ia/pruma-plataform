"use client"

import { useEffect, useRef, useState } from "react"
import { X, Check, Loader2 } from "lucide-react"

type Step = "card-form" | "loading" | "success" | "error"

interface Props {
  amount: number
  installments: number
  isOpen: boolean
  onClose: () => void
  profileIncomplete: boolean
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function SetupChargeModal({
  amount,
  installments,
  isOpen,
  onClose,
  profileIncomplete,
}: Props) {
  const [step, setStep] = useState<Step>("card-form")
  const [error, setError] = useState<string | null>(null)

  const [holderName, setHolderName] = useState("")
  const [cardNumber, setCardNumber] = useState("")
  const [expiryMonth, setExpiryMonth] = useState("")
  const [expiryYear, setExpiryYear] = useState("")
  const [ccv, setCcv] = useState("")

  const closeBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) closeBtnRef.current?.focus()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  if (!isOpen) return null

  function handleClose() {
    setStep("card-form")
    setError(null)
    setHolderName("")
    setCardNumber("")
    setExpiryMonth("")
    setExpiryYear("")
    setCcv("")
    onClose()
  }

  function formatCardNumber(value: string) {
    return value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim()
  }

  const installmentValue = Math.ceil((amount / installments) * 100) / 100

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
      const res = await fetch("/api/billing/setup-charge/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creditCard: {
            holderName,
            number: rawCard,
            expiryMonth,
            expiryYear,
            ccv,
          },
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

  const inputCls =
    "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
  const labelCls = "mb-1 block text-xs font-medium text-muted-foreground"

  const submitLabel =
    installments > 1
      ? `Pagar ${installments}x de ${formatBRL(installmentValue)}`
      : `Pagar ${formatBRL(amount)}`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="setup-modal-title"
        className="relative w-full max-w-md rounded-xl border bg-card shadow-xl"
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <p className="text-xs text-muted-foreground">Taxa de setup</p>
            <p id="setup-modal-title" className="font-semibold text-primary">
              {formatBRL(amount)}{" "}
              {installments > 1 && (
                <span className="text-sm font-normal text-muted-foreground">
                  em {installments}x de {formatBRL(installmentValue)}
                </span>
              )}
            </p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring outline-none"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="px-6 py-5">
          {/* Perfil incompleto */}
          {profileIncomplete && (
            <div className="space-y-4 py-2">
              <div
                role="alert"
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
              >
                <p className="font-medium">Cadastro incompleto</p>
                <p className="mt-1">Complete CNPJ e endereço antes de pagar.</p>
              </div>
              <a
                href="/settings/organization"
                className="block w-full rounded-lg bg-primary py-2.5 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring outline-none"
              >
                Completar dados
              </a>
              <button
                type="button"
                onClick={handleClose}
                className="w-full rounded-lg border border-input py-2.5 text-sm font-medium hover:bg-muted transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring outline-none"
              >
                Fechar
              </button>
            </div>
          )}

          {/* Card form */}
          {!profileIncomplete && step === "card-form" && (
            <div className="space-y-4">
              <div>
                <label htmlFor="sc-holderName" className={labelCls}>
                  Nome no cartão <span aria-hidden className="text-destructive">*</span>
                </label>
                <input
                  id="sc-holderName"
                  type="text"
                  autoComplete="cc-name"
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  className={inputCls}
                  placeholder="JOÃO A SILVA"
                />
              </div>
              <div>
                <label htmlFor="sc-cardNumber" className={labelCls}>
                  Número do cartão <span aria-hidden className="text-destructive">*</span>
                </label>
                <input
                  id="sc-cardNumber"
                  type="text"
                  autoComplete="cc-number"
                  inputMode="numeric"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  className={inputCls}
                  placeholder="0000 0000 0000 0000"
                  maxLength={19}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="sc-expiryMonth" className={labelCls}>
                    Mês <span aria-hidden className="text-destructive">*</span>
                  </label>
                  <input
                    id="sc-expiryMonth"
                    type="text"
                    autoComplete="cc-exp-month"
                    inputMode="numeric"
                    value={expiryMonth}
                    onChange={(e) => setExpiryMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
                    className={inputCls}
                    placeholder="MM"
                    maxLength={2}
                  />
                </div>
                <div>
                  <label htmlFor="sc-expiryYear" className={labelCls}>
                    Ano <span aria-hidden className="text-destructive">*</span>
                  </label>
                  <input
                    id="sc-expiryYear"
                    type="text"
                    autoComplete="cc-exp-year"
                    inputMode="numeric"
                    value={expiryYear}
                    onChange={(e) => setExpiryYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className={inputCls}
                    placeholder="AAAA"
                    maxLength={4}
                  />
                </div>
                <div>
                  <label htmlFor="sc-ccv" className={labelCls}>
                    CVV <span aria-hidden className="text-destructive">*</span>
                  </label>
                  <input
                    id="sc-ccv"
                    type="text"
                    autoComplete="cc-csc"
                    inputMode="numeric"
                    value={ccv}
                    onChange={(e) => setCcv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className={inputCls}
                    placeholder="000"
                    maxLength={4}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Loading */}
          {!profileIncomplete && step === "loading" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-accent" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Processando...</p>
            </div>
          )}

          {/* Sucesso */}
          {!profileIncomplete && step === "success" && (
            <div className="space-y-4 py-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                <Check className="h-6 w-6 text-accent" aria-hidden="true" />
              </div>
              <div>
                <p className="font-semibold text-primary">Pagamento realizado!</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Taxa de setup confirmada.
                </p>
              </div>
            </div>
          )}

          {/* Erro */}
          {!profileIncomplete && step === "error" && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}
        </div>

        {/* Footer — ações */}
        {!profileIncomplete && (step === "card-form" || step === "error" || step === "success") && (
          <div className="flex justify-end gap-3 border-t px-6 py-4">
            {step === "card-form" && (
              <>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring outline-none"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={submit}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring outline-none"
                >
                  {submitLabel}
                </button>
              </>
            )}
            {step === "error" && (
              <>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring outline-none"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => setStep("card-form")}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring outline-none"
                >
                  Tentar novamente
                </button>
              </>
            )}
            {step === "success" && (
              <button
                type="button"
                onClick={() => {
                  handleClose()
                  window.location.reload()
                }}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring outline-none"
              >
                Continuar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
