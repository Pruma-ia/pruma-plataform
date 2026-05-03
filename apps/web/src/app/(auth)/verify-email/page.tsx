"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Image from "next/image"

const DIGIT_COUNT = 6
const RESEND_COOLDOWN = 60

export default function VerifyEmailPage() {
  const { data: session, update } = useSession()
  const router = useRouter()

  const [digits, setDigits] = useState<string[]>(Array(DIGIT_COUNT).fill(""))
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN)

  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(DIGIT_COUNT).fill(null))

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  const focusCell = useCallback((index: number) => {
    inputRefs.current[index]?.focus()
  }, [])

  function handleDigitChange(index: number, value: string) {
    // Accept only digits
    const digit = value.replace(/\D/g, "").slice(-1)
    const newDigits = [...digits]
    newDigits[index] = digit
    setDigits(newDigits)
    setError("")
    if (digit && index < DIGIT_COUNT - 1) {
      focusCell(index + 1)
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[index]) {
        const newDigits = [...digits]
        newDigits[index] = ""
        setDigits(newDigits)
      } else if (index > 0) {
        focusCell(index - 1)
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      focusCell(index - 1)
    } else if (e.key === "ArrowRight" && index < DIGIT_COUNT - 1) {
      focusCell(index + 1)
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, DIGIT_COUNT)
    if (pasted.length === DIGIT_COUNT) {
      setDigits(pasted.split(""))
      setError("")
      // Focus last cell after paste
      focusCell(DIGIT_COUNT - 1)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const code = digits.join("")
    if (code.length < DIGIT_COUNT) return

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })

      if (res.ok) {
        // NextAuth v5: re-runs JWT callback; emailVerified flips to true in DB
        await update()
        router.push("/dashboard")
        return
      }

      const data = await res.json()
      if (res.status === 410 || data.error === "expired") {
        setError("Este código expirou. Solicite um novo abaixo.")
      } else if (res.status === 429 || data.error === "rate_limited") {
        setError("Muitas tentativas. Aguarde um momento antes de tentar novamente.")
      } else {
        setError("Código incorreto. Verifique e tente novamente.")
      }
    } catch {
      setError("Erro ao verificar o código. Tente novamente.")
    } finally {
      setLoading(false)
      // Clear all cells and focus first on any error
      setDigits(Array(DIGIT_COUNT).fill(""))
      focusCell(0)
    }
  }

  async function handleResend() {
    if (countdown > 0) return

    try {
      const res = await fetch("/api/auth/resend-otp", { method: "POST" })
      const data = await res.json()

      if (res.ok) {
        setCountdown(RESEND_COOLDOWN)
        setError("")
      } else if (res.status === 429 && data.retryAfterSeconds) {
        setCountdown(data.retryAfterSeconds)
      } else if (res.status === 429) {
        setError("Muitas tentativas. Aguarde um momento antes de tentar novamente.")
      }
    } catch {
      setError("Erro ao reenviar o código. Tente novamente.")
    }
  }

  const isComplete = digits.every((d) => d !== "")
  const email = (session?.user as { email?: string } | undefined)?.email ?? ""

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 shadow-2xl max-w-sm mx-auto">
      <div className="mb-7 flex flex-col items-center">
        <Image
          src="/logo-white.png"
          alt="Pruma"
          width={120}
          height={36}
          className="h-9 w-auto mb-7 mx-auto"
          priority
        />
        <h1 className="text-xl font-semibold text-white mb-1">Verifique seu e-mail</h1>
        <p className="text-sm text-white/60 mb-6 text-center">
          Enviamos um código de 6 dígitos para{" "}
          {email ? <strong className="text-white/80">{email}</strong> : "seu e-mail"}.{" "}
          Insira abaixo para ativar sua conta.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <fieldset>
          <legend className="sr-only">Código de verificação</legend>
          <div className="flex gap-2 justify-center mb-4">
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                aria-label={`Dígito ${i + 1} de 6`}
                autoComplete={i === 0 ? "one-time-code" : undefined}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                disabled={loading}
                className="w-11 h-12 rounded-lg border border-white/20 bg-white/10 text-center text-xl font-semibold text-white focus:ring-2 focus:ring-[#00AEEF]/70 focus:outline-none caret-transparent disabled:opacity-60"
              />
            ))}
          </div>
        </fieldset>

        <p
          role="alert"
          data-testid="otp-error"
          className="text-sm text-red-400 mt-2 min-h-5 text-center"
        >
          {error}
        </p>

        <button
          type="submit"
          disabled={!isComplete || loading}
          className="mt-4 w-full rounded-lg bg-[#00AEEF] py-3 text-sm font-semibold text-white hover:bg-[#00AEEF]/90 disabled:opacity-60 transition-colors"
        >
          {loading ? "Verificando..." : "Verificar código"}
        </button>
      </form>

      <div className="mt-5 flex justify-center text-sm">
        {countdown > 0 ? (
          <span className="text-white/40">
            Reenviar em{" "}
            <span className="text-[#00AEEF]/70">{countdown}s</span>
          </span>
        ) : (
          <button
            type="button"
            className="text-[#5CCFF5] hover:text-white transition-colors"
            onClick={handleResend}
          >
            Reenviar código
          </button>
        )}
      </div>
    </div>
  )
}
