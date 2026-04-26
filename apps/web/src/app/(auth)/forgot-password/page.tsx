"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
    setLoading(false)
    setSent(true)
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
        <p className="text-sm text-white/60">Recuperação de senha</p>
      </div>

      {sent ? (
        <div className="text-center space-y-4">
          <p className="text-sm text-white/80">
            Se houver uma conta com esse e-mail, você receberá um link para redefinir sua senha em
            breve.
          </p>
          <Link
            href="/login"
            className="inline-block text-sm text-[#5CCFF5] hover:text-white transition-colors"
          >
            Voltar ao login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-white/60 mb-2">
            Informe seu e-mail e enviaremos um link para criar uma nova senha.
          </p>
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/70"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#00AEEF] py-2.5 text-sm font-semibold text-white hover:bg-[#00AEEF]/90 disabled:opacity-60 transition-colors"
          >
            {loading ? "Enviando..." : "Enviar link"}
          </button>
          <p className="text-center text-xs text-white/40">
            <Link href="/login" className="font-medium text-[#5CCFF5] hover:text-white transition-colors">
              Voltar ao login
            </Link>
          </p>
        </form>
      )}
    </div>
  )
}
