"use client"

import { useState, useMemo } from "react"
import { Header } from "@/components/dashboard/header"
import { Check } from "lucide-react"
import { PASSWORD_RULES, PASSWORD_STRENGTH_COLORS, PASSWORD_STRENGTH_TEXT, PASSWORD_STRENGTH_LABELS } from "@/lib/password-rules"

const RULES = PASSWORD_RULES
const STRENGTH_LABELS = PASSWORD_STRENGTH_LABELS
const STRENGTH_COLORS = PASSWORD_STRENGTH_COLORS
const STRENGTH_TEXT = PASSWORD_STRENGTH_TEXT

export default function ProfilePage() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const strength = useMemo(() => RULES.filter((r) => r.test(newPassword)).length, [newPassword])
  const ruleResults = useMemo(() => RULES.map((r) => ({ ...r, ok: r.test(newPassword) })), [newPassword])
  const allRulesPassed = strength === RULES.length

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!allRulesPassed) {
      setError("A nova senha não atende todos os requisitos")
      return
    }
    if (newPassword !== confirm) {
      setError("As novas senhas não coincidem")
      return
    }
    setLoading(true)
    setError("")
    setSuccess(false)
    const res = await fetch("/api/user/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? "Erro ao alterar senha")
      return
    }
    setSuccess(true)
    setCurrentPassword("")
    setNewPassword("")
    setConfirm("")
  }

  return (
    <div>
      <Header title="Meu perfil" orgName="" orgLogoUrl={null} />
      <div className="flex justify-center p-6 pt-12">
        <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
          <h2 className="text-base font-semibold mb-6">Alterar senha</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Senha atual</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Nova senha</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />

              {newPassword.length > 0 && (
                <div className="mt-3 space-y-2">
                  {/* Strength bar */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Força da senha</span>
                    <span className={`text-xs font-medium ${STRENGTH_TEXT[strength]}`}>
                      {STRENGTH_LABELS[strength]}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {RULES.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                          i < strength ? STRENGTH_COLORS[strength] : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Rules checklist */}
                  <div className="mt-3 space-y-1.5 rounded-md bg-muted/50 p-3">
                    {ruleResults.map((rule) => (
                      <div key={rule.id} className="flex items-center gap-2">
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors ${
                            rule.ok ? "bg-green-500" : "bg-muted-foreground/20"
                          }`}
                        >
                          {rule.ok && <Check className="h-2.5 w-2.5 text-white stroke-[3]" />}
                        </div>
                        <span
                          className={`text-xs transition-colors ${
                            rule.ok ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {rule.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Confirmar nova senha</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {confirm.length > 0 && newPassword !== confirm && (
                <p className="mt-1.5 text-xs text-red-500">As senhas não coincidem</p>
              )}
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
            {success && <p className="text-sm text-green-600">Senha alterada com sucesso!</p>}

            <button
              type="submit"
              disabled={loading || !allRulesPassed || newPassword !== confirm}
              className="w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? "Salvando..." : "Alterar senha"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
