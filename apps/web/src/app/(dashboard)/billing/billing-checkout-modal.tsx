"use client"

import { useEffect, useRef, useState } from "react"
import { X, Check } from "lucide-react"

type Step = "card-form" | "loading" | "success" | "error"

interface Props {
  planLabel: string
  planPrice: string
  isOpen: boolean
  onClose: () => void
  profileIncomplete: boolean
}

export function BillingCheckoutModal({
  planLabel,
  planPrice,
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
      const res = await fetch("/api/billing/checkout", {
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
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#00AEEF] focus:ring-2 focus:ring-[#00AEEF]/20 transition-colors"
  const labelCls = "mb-1 block text-xs font-medium text-muted-foreground"

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
        aria-labelledby="checkout-modal-title"
        className="relative w-full max-w-md rounded-2xl bg-white shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <p className="text-xs text-muted-foreground">Assinar plano</p>
            <p id="checkout-modal-title" className="font-semibold text-[#0D1B4B]">
              {planLabel} — {planPrice}/mês
            </p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-[#00AEEF] outline-none"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="px-6 py-5">
          {/* Perfil incompleto — bloqueador */}
          {profileIncomplete && (
            <div className="space-y-4 py-2">
              <div
                role="alert"
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
              >
                <p className="font-medium">Cadastro incompleto</p>
                <p className="mt-1">
                  Complete CNPJ e endereço antes de assinar.
                </p>
              </div>
              <a
                href="/settings/organization"
                className="block w-full rounded-lg bg-[#00AEEF] py-2.5 text-center text-sm font-medium text-white hover:bg-[#0097d1] transition-colors focus-visible:ring-2 focus-visible:ring-[#00AEEF] outline-none"
              >
                Completar dados
              </a>
              <button
                type="button"
                onClick={handleClose}
                className="w-full rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-[#00AEEF] outline-none"
              >
                Fechar
              </button>
            </div>
          )}

          {/* Formulário do cartão */}
          {!profileIncomplete && step === "card-form" && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground">
                Cobrança recorrente mensal no cartão. Ativação imediata.
              </p>
              <div>
                <label htmlFor="holderName" className={labelCls}>
                  Nome no cartão
                </label>
                <input
                  id="holderName"
                  type="text"
                  autoComplete="cc-name"
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  className={inputCls}
                  placeholder="JOÃO A SILVA"
                />
              </div>
              <div>
                <label htmlFor="cardNumber" className={labelCls}>
                  Número do cartão
                </label>
                <input
                  id="cardNumber"
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
                  <label htmlFor="expiryMonth" className={labelCls}>
                    Mês
                  </label>
                  <input
                    id="expiryMonth"
                    type="text"
                    autoComplete="cc-exp-month"
                    inputMode="numeric"
                    value={expiryMonth}
                    onChange={(e) =>
                      setExpiryMonth(e.target.value.replace(/\D/g, "").slice(0, 2))
                    }
                    className={inputCls}
                    placeholder="MM"
                    maxLength={2}
                  />
                </div>
                <div>
                  <label htmlFor="expiryYear" className={labelCls}>
                    Ano
                  </label>
                  <input
                    id="expiryYear"
                    type="text"
                    autoComplete="cc-exp-year"
                    inputMode="numeric"
                    value={expiryYear}
                    onChange={(e) =>
                      setExpiryYear(e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    className={inputCls}
                    placeholder="AAAA"
                    maxLength={4}
                  />
                </div>
                <div>
                  <label htmlFor="ccv" className={labelCls}>
                    CVV
                  </label>
                  <input
                    id="ccv"
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

              <button
                type="button"
                onClick={submit}
                className="w-full rounded-lg bg-[#00AEEF] py-2.5 text-sm font-medium text-white hover:bg-[#0097d1] transition-colors focus-visible:ring-2 focus-visible:ring-[#00AEEF] outline-none"
              >
                Confirmar assinatura
              </button>
            </div>
          )}

          {/* Carregando */}
          {!profileIncomplete && step === "loading" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00AEEF] border-t-transparent" />
              <p className="text-sm text-muted-foreground">Processando...</p>
            </div>
          )}

          {/* Sucesso */}
          {!profileIncomplete && step === "success" && (
            <div className="space-y-4 py-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#E0F6FE]">
                <Check className="h-6 w-6 text-[#00AEEF]" aria-hidden="true" />
              </div>
              <div>
                <p className="font-semibold text-[#0D1B4B]">Assinatura ativada!</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Plano {planLabel} ativo. Bem-vindo à Pruma IA.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  handleClose()
                  window.location.reload()
                }}
                className="w-full rounded-lg bg-[#00AEEF] py-2.5 text-sm font-medium text-white hover:bg-[#0097d1] transition-colors focus-visible:ring-2 focus-visible:ring-[#00AEEF] outline-none"
              >
                Continuar
              </button>
            </div>
          )}

          {/* Erro */}
          {!profileIncomplete && step === "error" && (
            <div className="space-y-4">
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-[#00AEEF] outline-none"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => setStep("card-form")}
                  className="flex-1 rounded-lg bg-[#00AEEF] py-2.5 text-sm font-medium text-white hover:bg-[#0097d1] transition-colors focus-visible:ring-2 focus-visible:ring-[#00AEEF] outline-none"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
