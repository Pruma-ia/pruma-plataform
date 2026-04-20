"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: "", email: "", password: "", organizationName: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  function update(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? "Erro ao criar conta")
      setLoading(false)
      return
    }

    await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    })
    router.push("/dashboard")
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
        <p className="text-sm text-white/60">Crie sua conta e organização</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-white/70 mb-1.5">Seu nome</label>
          <input
            type="text"
            value={form.name}
            onChange={update("name")}
            required
            minLength={2}
            className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/70"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-white/70 mb-1.5">Nome da empresa / organização</label>
          <input
            type="text"
            value={form.organizationName}
            onChange={update("organizationName")}
            required
            minLength={2}
            className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/70"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-white/70 mb-1.5">E-mail</label>
          <input
            type="email"
            value={form.email}
            onChange={update("email")}
            required
            className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/70"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-white/70 mb-1.5">Senha</label>
          <input
            type="password"
            value={form.password}
            onChange={update("password")}
            required
            minLength={8}
            className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/70"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[#00AEEF] py-2.5 text-sm font-semibold text-white hover:bg-[#00AEEF]/90 disabled:opacity-60 transition-colors"
        >
          {loading ? "Criando conta..." : "Criar conta grátis"}
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-white/40">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-[#5CCFF5] hover:text-white transition-colors">
          Entrar
        </Link>
      </p>
    </div>
  )
}
