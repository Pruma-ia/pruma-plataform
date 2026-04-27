"use client"

import { useState, useEffect } from "react"

type Theme = "dark" | "light"

interface OrgProfileData {
  cnpj: string
  phone: string
  addressZipCode: string
  addressStreet: string
  addressNumber: string
  addressComplement: string
  addressCity: string
  addressState: string
}

interface Props {
  initialData?: Partial<OrgProfileData>
  onSuccess?: () => void
  onSkip?: () => void
  theme?: Theme
}

function formatCnpj(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
}

function formatPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11)
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3")
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3")
}

function formatCep(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8)
  return d.replace(/^(\d{5})(\d)/, "$1-$2")
}

function validateCnpj(raw: string): boolean {
  if (raw.length !== 14) return false
  if (/^(\d)\1+$/.test(raw)) return false
  const calc = (weights: number[]) =>
    weights.reduce((acc, w, i) => acc + parseInt(raw[i]) * w, 0) % 11
  const d1 = calc([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const r1 = d1 < 2 ? 0 : 11 - d1
  const d2 = calc([6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const r2 = d2 < 2 ? 0 : 11 - d2
  return r1 === parseInt(raw[12]) && r2 === parseInt(raw[13])
}

const inputClass = (dark: boolean) =>
  dark
    ? "w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/70"
    : "w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"

const labelClass = (dark: boolean) =>
  dark ? "block text-xs font-medium text-white/70 mb-1.5" : "block text-sm font-medium mb-1.5"

const errorClass = (dark: boolean) =>
  dark ? "text-xs text-red-400 mt-1" : "text-xs text-red-500 mt-1"

export function OrgProfileForm({ initialData, onSuccess, onSkip, theme = "light" }: Props) {
  const dark = theme === "dark"

  const [cnpj, setCnpj] = useState(initialData?.cnpj ? formatCnpj(initialData.cnpj) : "")
  const [phone, setPhone] = useState(initialData?.phone ? formatPhone(initialData.phone) : "")
  const [cep, setCep] = useState(initialData?.addressZipCode ? formatCep(initialData.addressZipCode) : "")
  const [street, setStreet] = useState(initialData?.addressStreet ?? "")
  const [number, setNumber] = useState(initialData?.addressNumber ?? "")
  const [complement, setComplement] = useState(initialData?.addressComplement ?? "")
  const [city, setCity] = useState(initialData?.addressCity ?? "")
  const [state, setState] = useState(initialData?.addressState ?? "")
  const [cepLoading, setCepLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [cnpjError, setCnpjError] = useState("")

  async function fetchCep(rawCep: string) {
    if (rawCep.length !== 8) return
    setCepLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setStreet(data.logradouro ?? "")
        setCity(data.localidade ?? "")
        setState(data.uf ?? "")
      }
    } catch {
      // ViaCEP best-effort — campos editáveis manualmente
    } finally {
      setCepLoading(false)
    }
  }

  function handleCnpjChange(v: string) {
    const formatted = formatCnpj(v)
    setCnpj(formatted)
    const raw = formatted.replace(/\D/g, "")
    if (raw.length === 14) {
      setCnpjError(validateCnpj(raw) ? "" : "CNPJ inválido")
    } else {
      setCnpjError("")
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const rawCnpj = cnpj.replace(/\D/g, "")
    const rawCep = cep.replace(/\D/g, "")
    if (!rawCnpj) { setCnpjError("CNPJ é obrigatório"); return }
    if (!validateCnpj(rawCnpj)) { setCnpjError("CNPJ inválido"); return }
    if (rawCep.length !== 8) { setError("CEP deve ter 8 dígitos"); return }
    if (!street) { setError("Rua / Avenida é obrigatório"); return }
    if (!number) { setError("Número é obrigatório"); return }
    if (!city) { setError("Cidade é obrigatória"); return }
    if (!state) { setError("UF é obrigatória"); return }
    setLoading(true)
    setError("")
    const res = await fetch("/api/user/org-profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cnpj: rawCnpj,
        phone: phone.replace(/\D/g, "") || null,
        addressZipCode: rawCep,
        addressStreet: street,
        addressNumber: number,
        addressComplement: complement || null,
        addressCity: city,
        addressState: state,
      }),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error?.message ?? "Erro ao salvar dados")
      return
    }
    setSuccess(true)
    onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* CNPJ */}
      <div>
        <label className={labelClass(dark)}>CNPJ</label>
        <input
          type="text"
          value={cnpj}
          onChange={(e) => handleCnpjChange(e.target.value)}
          placeholder="00.000.000/0000-00"
          className={inputClass(dark)}
        />
        {cnpjError && <p className={errorClass(dark)}>{cnpjError}</p>}
      </div>

      {/* Telefone */}
      <div>
        <label className={labelClass(dark)}>Telefone</label>
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          placeholder="(11) 99999-0000"
          className={inputClass(dark)}
        />
      </div>

      {/* CEP */}
      <div>
        <label className={labelClass(dark)}>CEP</label>
        <input
          type="text"
          value={cep}
          onChange={(e) => setCep(formatCep(e.target.value))}
          onBlur={(e) => fetchCep(e.target.value.replace(/\D/g, ""))}
          placeholder="00000-000"
          className={inputClass(dark)}
        />
        {cepLoading && (
          <p className={dark ? "text-xs text-white/40 mt-1" : "text-xs text-muted-foreground mt-1"}>
            Buscando endereço...
          </p>
        )}
      </div>

      {/* Logradouro + Número */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className={labelClass(dark)}>Rua / Avenida</label>
          <input
            type="text"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder="Rua Exemplo"
            className={inputClass(dark)}
          />
        </div>
        <div>
          <label className={labelClass(dark)}>Número</label>
          <input
            type="text"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="100"
            className={inputClass(dark)}
          />
        </div>
      </div>

      {/* Complemento */}
      <div>
        <label className={labelClass(dark)}>Complemento <span className={dark ? "text-white/30" : "text-muted-foreground"}>(opcional)</span></label>
        <input
          type="text"
          value={complement}
          onChange={(e) => setComplement(e.target.value)}
          placeholder="Sala 42, Andar 3..."
          className={inputClass(dark)}
        />
      </div>

      {/* Cidade + UF */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className={labelClass(dark)}>Cidade</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="São Paulo"
            className={inputClass(dark)}
          />
        </div>
        <div>
          <label className={labelClass(dark)}>UF</label>
          <input
            type="text"
            value={state}
            onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
            placeholder="SP"
            maxLength={2}
            className={inputClass(dark)}
          />
        </div>
      </div>

      {error && <p className={errorClass(dark)}>{error}</p>}
      {success && !onSuccess && (
        <p className={dark ? "text-sm text-green-400" : "text-sm text-green-600"}>
          Dados salvos com sucesso!
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={loading || !!cnpjError}
          className={
            dark
              ? "flex-1 rounded-lg bg-[#00AEEF] py-2.5 text-sm font-semibold text-white hover:bg-[#00AEEF]/90 disabled:opacity-60 transition-colors"
              : "flex-1 rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          }
        >
          {loading ? "Salvando..." : "Salvar dados"}
        </button>
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className={
              dark
                ? "px-4 rounded-lg border border-white/20 text-sm text-white/60 hover:text-white/90 transition-colors"
                : "px-4 rounded-md border text-sm text-muted-foreground hover:text-foreground transition-colors"
            }
          >
            Pular
          </button>
        )}
      </div>
    </form>
  )
}
