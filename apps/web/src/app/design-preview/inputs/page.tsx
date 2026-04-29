"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff, Search, AlertCircle, CheckCircle2 } from "lucide-react"

function Label({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground">
      {children}
      {required && <span className="ml-1 text-destructive" aria-hidden>*</span>}
    </label>
  )
}

function HelperText({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-muted-foreground">{children}</p>
}

function ErrorMsg({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mt-1 flex items-center gap-1 text-xs text-destructive">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {children}
    </p>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 font-heading text-lg font-semibold">{title}</h2>
      <div className="rounded-xl border border-border bg-card p-6">{children}</div>
    </section>
  )
}

const inputBase =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

const inputError = "border-destructive focus-visible:ring-destructive/30"

export default function InputsPage() {
  const [showPass, setShowPass] = useState(false)

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold">Inputs & Forms</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Todo input tem label visível. Erros aparecem abaixo do campo. Validação no blur.
        </p>
      </div>

      <Section title="Inputs Padrão">
        <div className="space-y-5">
          {/* Normal */}
          <div className="space-y-1.5">
            <Label htmlFor="name" required>Nome completo</Label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Ex: João Silva"
              className={inputBase}
            />
          </div>

          {/* With helper */}
          <div className="space-y-1.5">
            <Label htmlFor="email" required>E-mail</Label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="joao@empresa.com.br"
              className={inputBase}
            />
            <HelperText>Use o e-mail corporativo cadastrado na organização.</HelperText>
          </div>

          {/* Error state */}
          <div className="space-y-1.5">
            <Label htmlFor="cnpj" required>CNPJ</Label>
            <input
              id="cnpj"
              type="text"
              aria-invalid
              aria-describedby="cnpj-error"
              placeholder="00.000.000/0001-00"
              defaultValue="12.345"
              className={`${inputBase} ${inputError}`}
            />
            <ErrorMsg>CNPJ inválido. Verifique o número digitado.</ErrorMsg>
          </div>

          {/* Disabled */}
          <div className="space-y-1.5">
            <Label htmlFor="org-id">ID da organização</Label>
            <input
              id="org-id"
              type="text"
              disabled
              value="org_01HXYZ"
              className={inputBase}
            />
            <HelperText>Gerado automaticamente. Não editável.</HelperText>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password" required>Senha</Label>
            <div className="relative">
              <input
                id="password"
                type={showPass ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                className={`${inputBase} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="space-y-1.5">
            <Label htmlFor="search">Buscar aprovações</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="search"
                type="search"
                placeholder="Buscar por nome, fluxo..."
                className={`${inputBase} pl-9`}
              />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Select e Textarea">
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <select id="status" className={inputBase}>
              <option value="">Todos os status</option>
              <option value="pending">Pendente</option>
              <option value="approved">Aprovado</option>
              <option value="rejected">Rejeitado</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="comment" required>Comentário de rejeição</Label>
            <textarea
              id="comment"
              rows={3}
              placeholder="Explique o motivo da rejeição..."
              className={`${inputBase} h-auto resize-none`}
            />
            <HelperText>Obrigatório ao rejeitar uma aprovação.</HelperText>
          </div>
        </div>
      </Section>

      <Section title="Formulário Completo — Exemplo">
        <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="form-name" required>Nome</Label>
              <input id="form-name" type="text" autoComplete="given-name" className={inputBase} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="form-sobrenome" required>Sobrenome</Label>
              <input id="form-sobrenome" type="text" autoComplete="family-name" className={inputBase} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="form-email" required>E-mail</Label>
            <input id="form-email" type="email" autoComplete="email" className={inputBase} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="form-role">Função</Label>
            <select id="form-role" className={inputBase}>
              <option value="">Selecione...</option>
              <option value="admin">Administrador</option>
              <option value="member">Membro</option>
            </select>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button type="submit">Salvar alterações</Button>
            <Button type="button" variant="outline">Cancelar</Button>
          </div>
        </form>
      </Section>

      <Section title="Regras">
        <div className="space-y-2 text-sm">
          <div className="flex gap-2">
            <span className="text-emerald-600">✓</span>
            <span>Label visível acima de todo input — nunca só placeholder</span>
          </div>
          <div className="flex gap-2">
            <span className="text-emerald-600">✓</span>
            <span><code className="rounded bg-muted px-1 font-mono text-xs">htmlFor</code> + <code className="rounded bg-muted px-1 font-mono text-xs">id</code> em todo par label/input</span>
          </div>
          <div className="flex gap-2">
            <span className="text-emerald-600">✓</span>
            <span>Erro abaixo do campo com <code className="rounded bg-muted px-1 font-mono text-xs">role="alert"</code></span>
          </div>
          <div className="flex gap-2">
            <span className="text-emerald-600">✓</span>
            <span>Campos obrigatórios marcados com <code className="rounded bg-muted px-1 font-mono text-xs">*</code></span>
          </div>
          <div className="flex gap-2">
            <span className="text-emerald-600">✓</span>
            <span><code className="rounded bg-muted px-1 font-mono text-xs">autoComplete</code> semântico em todos os campos de auth</span>
          </div>
          <div className="flex gap-2">
            <span className="text-destructive">✗</span>
            <span>Validar no keystroke — validar no blur</span>
          </div>
        </div>
      </Section>
    </div>
  )
}
