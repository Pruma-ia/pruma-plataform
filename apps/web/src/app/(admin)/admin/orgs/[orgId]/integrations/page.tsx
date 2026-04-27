"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"

export default function IntegrationsPage() {
  const { orgId } = useParams<{ orgId: string }>()
  const [n8nSlug, setN8nSlug] = useState("")
  const [input, setInput] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/orgs/${orgId}/integrations`)
      .then((r) => r.json())
      .then((data) => {
        setN8nSlug(data.n8nSlug ?? "")
        setInput(data.n8nSlug ?? "")
      })
  }, [orgId])

  async function handleSave() {
    setError("")
    setSaving(true)
    const res = await fetch(`/api/admin/orgs/${orgId}/integrations`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ n8nSlug: input }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      setError(data.error ?? "Erro ao salvar")
    } else {
      setN8nSlug(input)
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <div className="border-b px-6 py-4">
        <h1 className="text-xl font-semibold">Integrações</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configurações de integração n8n para esta organização</p>
      </div>

      <div className="p-6 max-w-xl space-y-8">
        {/* n8nSlug */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div>
            <h2 className="font-semibold text-sm">Slug de integração n8n</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Identificador imutável usado no <code className="bg-muted px-1 rounded">pruma.json</code> de cada repo de
              cliente. Separado do slug de URL — pode fazer rebranding sem quebrar fluxos.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="ex: octavio-barber"
              className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#00AEEF]"
            />
            <button
              onClick={handleSave}
              disabled={saving || !input || input === n8nSlug}
              className="rounded-lg bg-[#0D1B4B] px-4 py-2 text-sm text-white hover:bg-[#0D1B4B]/80 disabled:opacity-40 transition-colors"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          {n8nSlug && (
            <div className="rounded-lg bg-muted p-3 flex items-center justify-between gap-3">
              <span className="font-mono text-sm text-foreground">{n8nSlug}</span>
              <button
                onClick={() => copy(n8nSlug)}
                className="text-xs text-[#00AEEF] hover:underline shrink-0"
              >
                {copied ? "Copiado!" : "Copiar"}
              </button>
            </div>
          )}
        </div>

        {/* Instruções pruma.json */}
        {n8nSlug && (
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <h2 className="font-semibold text-sm">Como usar no repo do cliente</h2>
            <p className="text-xs text-muted-foreground">
              Copie o bloco abaixo para o <code className="bg-muted px-1 rounded">pruma.json</code> na raiz do repo do
              cliente:
            </p>
            <div className="relative">
              <pre className="rounded-lg bg-[#0D1B4B] text-[#E0F6FE] text-xs p-4 overflow-x-auto leading-relaxed">
                {JSON.stringify(
                  {
                    organizationSlug: n8nSlug,
                    prumaApiUrl: process.env.NEXT_PUBLIC_APP_URL,
                    workflows: [],
                  },
                  null,
                  2
                )}
              </pre>
              <button
                onClick={() =>
                  copy(
                    JSON.stringify(
                      { organizationSlug: n8nSlug, prumaApiUrl: process.env.NEXT_PUBLIC_APP_URL, workflows: [] },
                      null,
                      2
                    )
                  )
                }
                className="absolute top-2 right-2 text-xs text-[#00AEEF] hover:underline"
              >
                {copied ? "Copiado!" : "Copiar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
