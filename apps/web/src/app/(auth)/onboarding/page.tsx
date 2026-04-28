"use client"

import { useState } from "react"
import Image from "next/image"

export default function OnboardingPage() {
  const [organizationName, setOrganizationName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await fetch("/api/auth/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationName }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? "Erro ao criar organização")
      setLoading(false)
      return
    }

    // Hard reload: força NextAuth a re-executar JWT callback, que agora encontra org criada
    window.location.href = "/onboarding/org-profile"
  }

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
        <p className="text-sm text-white/60">Crie sua organização para continuar</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-white/70 mb-1.5">
            Nome da empresa / organização
          </label>
          <input
            type="text"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            required
            minLength={2}
            autoFocus
            className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/70"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[#00AEEF] py-2.5 text-sm font-semibold text-white hover:bg-[#00AEEF]/90 disabled:opacity-60 transition-colors"
        >
          {loading ? "Criando..." : "Criar organização"}
        </button>
      </form>
    </div>
  )
}
