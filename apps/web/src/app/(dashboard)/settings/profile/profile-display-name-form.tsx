"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface ProfileDisplayNameFormProps {
  initialName: string
  email: string
}

export function ProfileDisplayNameForm({ initialName, email }: ProfileDisplayNameFormProps) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const isUnchanged = name.trim() === initialName.trim()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isUnchanged || loading) return

    setLoading(true)
    setError("")
    setSuccess(false)

    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      const fieldErrors = data.error?.fieldErrors?.name
      if (fieldErrors?.length) {
        setError(fieldErrors[0])
      } else {
        setError(data.error?.message ?? "Erro ao salvar nome")
      }
      return
    }

    setSuccess(true)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="display-name" className="block text-sm font-medium mb-1.5">
          Nome de exibição
        </label>
        <input
          id="display-name"
          type="text"
          autoComplete="name"
          maxLength={120}
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setSuccess(false)
            setError("")
          }}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-0.5">E-mail</p>
        <p className="text-sm">{email}</p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="text-sm text-emerald-600">
          Nome atualizado com sucesso!
        </p>
      )}

      <button
        type="submit"
        disabled={isUnchanged || loading}
        className="w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {loading ? "Salvando..." : "Salvar nome"}
      </button>
    </form>
  )
}
