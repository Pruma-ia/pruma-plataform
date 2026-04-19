"use client"

import { useState } from "react"
import { UserPlus } from "lucide-react"

export function InviteMemberForm() {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("member")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ inviteUrl?: string; error?: string } | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    const res = await fetch("/api/organizations/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    })
    const data = await res.json()
    setLoading(false)
    if (res.ok) {
      setResult({ inviteUrl: data.inviteUrl })
      setEmail("")
    } else {
      setResult({ error: "Erro ao enviar convite" })
    }
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h2 className="mb-4 font-semibold">Convidar membro</h2>
      <form onSubmit={submit} className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="colaborador@empresa.com"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Função</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="admin">Admin</option>
            <option value="member">Membro</option>
            <option value="viewer">Visualizador</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          {loading ? "Enviando..." : "Convidar"}
        </button>
      </form>

      {result?.inviteUrl && (
        <div className="mt-3 rounded-lg bg-muted p-3">
          <p className="text-xs text-muted-foreground mb-1">Link de convite (válido por 7 dias):</p>
          <code className="text-xs break-all">{result.inviteUrl}</code>
        </div>
      )}
      {result?.error && (
        <p className="mt-2 text-sm text-destructive">{result.error}</p>
      )}
    </div>
  )
}
