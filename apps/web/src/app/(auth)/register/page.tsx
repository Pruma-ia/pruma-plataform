"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: "", email: "", password: "", organizationName: "" })
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  const passwordRules = [
    { label: "Mínimo 8 caracteres", met: form.password.length >= 8 },
    { label: "Letra maiúscula", met: /[A-Z]/.test(form.password) },
    { label: "Letra minúscula", met: /[a-z]/.test(form.password) },
    { label: "Número", met: /\d/.test(form.password) },
    { label: "Caractere especial (!@#$...)", met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(form.password) },
  ]
  const passwordValid = passwordRules.every((r) => r.met)

  function update(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!acceptedTerms) {
      setError("Você precisa aceitar os Termos de Uso e a Política de Privacidade para continuar.")
      return
    }
    setLoading(true)
    setError("")

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, acceptedTerms, marketingConsent }),
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

      <button
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 py-2.5 text-sm font-medium text-white hover:bg-white/20 transition-colors"
      >
        <GoogleIcon />
        Continuar com Google
      </button>

      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/15" />
        </div>
        <div className="relative flex justify-center text-xs text-white/40 px-2">
          <span className="bg-transparent px-2">ou cadastre com e-mail</span>
        </div>
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
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            required
            className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/70"
          />
          {(passwordFocused || form.password.length > 0) && (
            <ul className="mt-2 space-y-1">
              {passwordRules.map((rule) => (
                <li key={rule.label} className={`flex items-center gap-1.5 text-xs ${rule.met ? "text-green-400" : "text-white/40"}`}>
                  <span>{rule.met ? "✓" : "○"}</span>
                  {rule.label}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-3 pt-1">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/30 bg-white/10 accent-[#00AEEF]"
            />
            <span className="text-xs text-white/70 leading-relaxed">
              Li e aceito os{" "}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#5CCFF5] hover:text-white underline">
                Termos de Uso
              </a>{" "}
              e a{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#5CCFF5] hover:text-white underline">
                Política de Privacidade
              </a>
              . <span className="text-white/40">(obrigatório)</span>
            </span>
          </label>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={marketingConsent}
              onChange={(e) => setMarketingConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/30 bg-white/10 accent-[#00AEEF]"
            />
            <span className="text-xs text-white/60 leading-relaxed">
              Quero receber novidades, atualizações e dicas da Pruma IA. <span className="text-white/40">(opcional)</span>
            </span>
          </label>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading || !acceptedTerms || !passwordValid}
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
