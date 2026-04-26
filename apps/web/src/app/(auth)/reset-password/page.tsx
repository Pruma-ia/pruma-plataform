"use client"

import { useState, Suspense, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Check } from "lucide-react"
import { PASSWORD_RULES, PASSWORD_STRENGTH_COLORS, PASSWORD_STRENGTH_TEXT, PASSWORD_STRENGTH_LABELS } from "@/lib/password-rules"

const RULES = PASSWORD_RULES
const STRENGTH_COLORS = PASSWORD_STRENGTH_COLORS
const STRENGTH_TEXT = PASSWORD_STRENGTH_TEXT
const STRENGTH_LABELS = PASSWORD_STRENGTH_LABELS

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token") ?? ""

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  const strength = useMemo(() => RULES.filter((r) => r.test(password)).length, [password])
  const ruleResults = useMemo(() => RULES.map((r) => ({ ...r, ok: r.test(password) })), [password])
  const allRulesPassed = strength === RULES.length

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!allRulesPassed) {
      setError("A senha não atende todos os requisitos")
      return
    }
    if (password !== confirm) {
      setError("As senhas não coincidem")
      return
    }
    setLoading(true)
    setError("")
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? "Erro ao redefinir senha")
      return
    }
    setDone(true)
    setTimeout(() => router.push("/login"), 2500)
  }

  if (!token) {
    return (
      <p className="text-sm text-red-400 text-center">
        Link inválido.{" "}
        <Link href="/forgot-password" className="text-[#5CCFF5]">
          Solicitar novo link
        </Link>
      </p>
    )
  }

  return done ? (
    <div className="text-center space-y-3">
      <p className="text-sm text-white/80">Senha redefinida com sucesso! Redirecionando...</p>
    </div>
  ) : (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-white/70 mb-1.5">Nova senha</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/70"
        />

        {password.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">Força da senha</span>
              <span className={`text-xs font-medium ${STRENGTH_TEXT[strength]}`}>
                {STRENGTH_LABELS[strength]}
              </span>
            </div>
            <div className="flex gap-1">
              {RULES.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    i < strength ? STRENGTH_COLORS[strength] : "bg-white/15"
                  }`}
                />
              ))}
            </div>
            <div className="mt-2 space-y-1.5 rounded-lg bg-white/5 p-3">
              {ruleResults.map((rule) => (
                <div key={rule.id} className="flex items-center gap-2">
                  <div
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors ${
                      rule.ok ? "bg-green-500" : "bg-white/10"
                    }`}
                  >
                    {rule.ok && <Check className="h-2.5 w-2.5 text-white stroke-[3]" />}
                  </div>
                  <span className={`text-xs ${rule.ok ? "text-white/80" : "text-white/40"}`}>
                    {rule.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-white/70 mb-1.5">Confirmar nova senha</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/70"
        />
        {confirm.length > 0 && password !== confirm && (
          <p className="mt-1.5 text-xs text-red-400">As senhas não coincidem</p>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading || !allRulesPassed || password !== confirm}
        className="w-full rounded-lg bg-[#00AEEF] py-2.5 text-sm font-semibold text-white hover:bg-[#00AEEF]/90 disabled:opacity-50 transition-colors"
      >
        {loading ? "Salvando..." : "Redefinir senha"}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 shadow-2xl">
      <div className="mb-7 flex flex-col items-center gap-3">
        <Image
          src="/logo-white.png"
          alt="Pruma IA"
          width={140}
          height={38}
          priority
          className="h-9 w-auto"
        />
        <p className="text-sm text-white/60">Criar nova senha</p>
      </div>
      <Suspense fallback={<p className="text-sm text-white/60 text-center">Carregando...</p>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
