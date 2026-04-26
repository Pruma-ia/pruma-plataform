"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function TermsAcceptanceModal() {
  const router = useRouter()
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleAccept() {
    setLoading(true)
    setError("")

    const res = await fetch("/api/auth/accept-terms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marketingConsent }),
    })

    if (!res.ok) {
      setError("Erro ao registrar aceite. Tente novamente.")
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-2">Termos atualizados</h2>
          <p className="text-sm text-muted-foreground">
            Atualizamos nossa Política de Privacidade e Termos de Uso para adequação à LGPD. Por favor, revise e aceite para continuar usando a Pruma IA.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <div className="rounded-lg border border-border bg-muted/50 p-4 text-xs text-muted-foreground space-y-1">
            <p>• <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#00AEEF] underline">Política de Privacidade</a></p>
            <p>• <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#00AEEF] underline">Termos de Uso</a></p>
            <p>• <a href="/dpa" target="_blank" rel="noopener noreferrer" className="text-[#00AEEF] underline">DPA (Data Processing Agreement)</a></p>
            <p>• <a href="/cookies" target="_blank" rel="noopener noreferrer" className="text-[#00AEEF] underline">Aviso de Cookies</a></p>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={marketingConsent}
              onChange={(e) => setMarketingConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-[#00AEEF]"
            />
            <span className="text-xs text-muted-foreground leading-relaxed">
              Quero receber novidades, atualizações e dicas da Pruma IA. <span className="opacity-60">(opcional)</span>
            </span>
          </label>
        </div>

        {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

        <button
          onClick={handleAccept}
          disabled={loading}
          className="w-full rounded-lg bg-[#00AEEF] py-2.5 text-sm font-semibold text-white hover:bg-[#00AEEF]/90 disabled:opacity-60 transition-colors"
        >
          {loading ? "Registrando..." : "Li e aceito os termos"}
        </button>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          Ao aceitar, você confirma que leu e concordou com os documentos listados acima.
        </p>
      </div>
    </div>
  )
}
