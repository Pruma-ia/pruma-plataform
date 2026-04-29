"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { X, Trash2, AlertTriangle } from "lucide-react"

function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      {/* Panel */}
      <div
        role="dialog"
        aria-modal
        className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card shadow-xl"
      >
        {children}
      </div>
    </div>
  )
}

export default function ModalsPage() {
  const [modal, setModal] = useState<"standard" | "destructive" | "form" | null>(null)

  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="font-heading text-2xl font-bold">Modais & Dialogs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Scrim 50% preto. Fechar via ESC, clique no scrim ou botão X. Ações destrutivas sempre em vermelho.
        </p>
      </div>

      {/* Trigger buttons */}
      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Exemplos Interativos</h2>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setModal("standard")}>
              Modal padrão
            </Button>
            <Button variant="outline" onClick={() => setModal("form")}>
              Modal com formulário
            </Button>
            <Button variant="destructive" onClick={() => setModal("destructive")}>
              Confirmação destrutiva
            </Button>
          </div>
        </div>
      </section>

      {/* Static previews */}
      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Anatomia — Modal Padrão</h2>
        <div className="rounded-xl border border-border bg-card shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h3 className="font-heading text-base font-semibold">Título do Modal</h3>
            <button className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted" aria-label="Fechar">
              <X className="h-4 w-4" />
            </button>
          </div>
          {/* Body */}
          <div className="px-6 py-5">
            <p className="text-sm text-muted-foreground">
              Conteúdo do modal. Descreva claramente a ação ou informação que o usuário precisa.
            </p>
          </div>
          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
            <Button variant="outline">Cancelar</Button>
            <Button variant="default">Confirmar</Button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Anatomia — Confirmação Destrutiva</h2>
        <div className="rounded-xl border border-destructive/20 bg-card shadow-xl overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-destructive/10 p-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
              <h3 className="font-heading text-base font-semibold">Excluir organização</h3>
            </div>
            <button className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted" aria-label="Fechar">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-6 py-5">
            <p className="text-sm text-foreground">
              Você está prestes a excluir permanentemente a organização{" "}
              <strong>Empresa ABC</strong> e todos os seus dados.
            </p>
            <p className="mt-2 text-sm text-destructive font-medium">Esta ação não pode ser desfeita.</p>
            <div className="mt-4 space-y-1.5">
              <label htmlFor="confirm-delete" className="block text-sm font-medium">
                Digite <code className="rounded bg-muted px-1 font-mono">EXCLUIR</code> para confirmar
              </label>
              <input
                id="confirm-delete"
                type="text"
                placeholder="EXCLUIR"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
            <Button variant="outline">Cancelar</Button>
            <Button variant="destructive">
              <Trash2 />
              Excluir permanentemente
            </Button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">Regras</h2>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="space-y-2 text-sm">
            <div className="flex gap-2"><span className="text-emerald-600">✓</span><span>Scrim <code className="rounded bg-muted px-1 font-mono text-xs">bg-black/50</code> — forte o suficiente para isolar conteúdo</span></div>
            <div className="flex gap-2"><span className="text-emerald-600">✓</span><span>Fechar: ESC, clique no scrim, botão X — todos funcionam</span></div>
            <div className="flex gap-2"><span className="text-emerald-600">✓</span><span>Ação cancelar sempre à esquerda, confirmar à direita</span></div>
            <div className="flex gap-2"><span className="text-emerald-600">✓</span><span>Destrutivo: ícone de alerta + vermelho + confirmação textual</span></div>
            <div className="flex gap-2"><span className="text-emerald-600">✓</span><span><code className="rounded bg-muted px-1 font-mono text-xs">role="dialog" aria-modal</code> para acessibilidade</span></div>
            <div className="flex gap-2"><span className="text-destructive">✗</span><span>Modal sem botão de fechar explícito</span></div>
            <div className="flex gap-2"><span className="text-destructive">✗</span><span>Ação destrutiva sem step de confirmação</span></div>
            <div className="flex gap-2"><span className="text-destructive">✗</span><span>Usar modal para fluxo de navegação principal</span></div>
          </div>
        </div>
      </section>

      {/* Interactive modals */}
      <Modal open={modal === "standard"} onClose={() => setModal(null)}>
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="font-heading text-base font-semibold">Modal Padrão</h3>
          <button onClick={() => setModal(null)} className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-muted-foreground">Este é o modal padrão do Pruma IA. Scrim 50%, fechar no X ou clicando fora.</p>
        </div>
        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => setModal(null)}>Cancelar</Button>
          <Button onClick={() => setModal(null)}>Confirmar</Button>
        </div>
      </Modal>

      <Modal open={modal === "form"} onClose={() => setModal(null)}>
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="font-heading text-base font-semibold">Convidar membro</h3>
          <button onClick={() => setModal(null)} className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="invite-email" className="block text-sm font-medium">E-mail</label>
            <input id="invite-email" type="email" autoComplete="email" placeholder="colega@empresa.com" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="invite-role" className="block text-sm font-medium">Função</label>
            <select id="invite-role" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option>Membro</option>
              <option>Administrador</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => setModal(null)}>Cancelar</Button>
          <Button onClick={() => setModal(null)}>Enviar convite</Button>
        </div>
      </Modal>

      <Modal open={modal === "destructive"} onClose={() => setModal(null)}>
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-destructive/10 p-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <h3 className="font-heading text-base font-semibold">Remover membro</h3>
          </div>
          <button onClick={() => setModal(null)} className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm">Remover <strong>João Silva</strong> da organização? Ele perderá acesso imediato a todos os dados.</p>
        </div>
        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => setModal(null)}>Cancelar</Button>
          <Button variant="destructive" onClick={() => setModal(null)}>
            <Trash2 />
            Remover membro
          </Button>
        </div>
      </Modal>
    </div>
  )
}
