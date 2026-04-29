import { Button } from "@/components/ui/button"
import { Loader2, Trash2, Plus, ArrowRight, Download } from "lucide-react"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 font-heading text-lg font-semibold">{title}</h2>
      <div className="rounded-xl border border-border bg-card p-6">{children}</div>
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="w-32 shrink-0">
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

export default function ButtonsPage() {
  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold">Botões</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Uma ação primária por tela. Demais ações: secondary, outline ou ghost.
        </p>
      </div>

      <Section title="Variantes">
        <div className="space-y-4">
          <Row label="default (primary)">
            <Button variant="default">Aprovar</Button>
            <code className="font-mono text-xs text-muted-foreground">variant="default"</code>
          </Row>
          <Row label="secondary">
            <Button variant="secondary">Ver detalhes</Button>
            <code className="font-mono text-xs text-muted-foreground">variant="secondary"</code>
          </Row>
          <Row label="outline">
            <Button variant="outline">Cancelar</Button>
            <code className="font-mono text-xs text-muted-foreground">variant="outline"</code>
          </Row>
          <Row label="ghost">
            <Button variant="ghost">Configurações</Button>
            <code className="font-mono text-xs text-muted-foreground">variant="ghost"</code>
          </Row>
          <Row label="destructive">
            <Button variant="destructive">
              <Trash2 />
              Excluir
            </Button>
            <code className="font-mono text-xs text-muted-foreground">variant="destructive"</code>
          </Row>
          <Row label="link">
            <Button variant="link">Ver documentação</Button>
            <code className="font-mono text-xs text-muted-foreground">variant="link"</code>
          </Row>
        </div>
      </Section>

      <Section title="Tamanhos">
        <div className="flex flex-wrap items-center gap-3">
          <Button size="xs">Extra Small</Button>
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button size="icon" variant="outline">
            <Plus />
          </Button>
          <Button size="icon-sm" variant="outline">
            <Download />
          </Button>
          <Button size="icon-xs" variant="outline">
            <Trash2 />
          </Button>
          <code className="font-mono text-xs text-muted-foreground">size="icon" | "icon-sm" | "icon-xs"</code>
        </div>
      </Section>

      <Section title="Com Ícones">
        <div className="flex flex-wrap gap-3">
          <Button variant="default">
            <Plus />
            Nova aprovação
          </Button>
          <Button variant="secondary">
            Download
            <Download />
          </Button>
          <Button variant="outline">
            Próximo
            <ArrowRight />
          </Button>
        </div>
      </Section>

      <Section title="Estados">
        <div className="space-y-4">
          <Row label="Loading">
            <Button disabled>
              <Loader2 className="animate-spin" />
              Salvando...
            </Button>
            <code className="font-mono text-xs text-muted-foreground">disabled + Loader2 animate-spin</code>
          </Row>
          <Row label="Disabled">
            <Button disabled variant="default">Confirmar</Button>
            <Button disabled variant="outline">Cancelar</Button>
            <code className="font-mono text-xs text-muted-foreground">disabled</code>
          </Row>
        </div>
      </Section>

      <Section title="Regras de Uso">
        <div className="space-y-2 text-sm">
          <div className="flex gap-2">
            <span className="mt-0.5 text-emerald-600">✓</span>
            <span>Uma ação <strong>default</strong> por tela — a ação principal do contexto</span>
          </div>
          <div className="flex gap-2">
            <span className="mt-0.5 text-emerald-600">✓</span>
            <span>Dialog de confirmação obrigatório antes de <strong>destructive</strong></span>
          </div>
          <div className="flex gap-2">
            <span className="mt-0.5 text-emerald-600">✓</span>
            <span>Botão <strong>disabled</strong> + spinner durante operação async</span>
          </div>
          <div className="flex gap-2">
            <span className="mt-0.5 text-destructive">✗</span>
            <span>Dois botões <strong>default</strong> lado a lado</span>
          </div>
          <div className="flex gap-2">
            <span className="mt-0.5 text-destructive">✗</span>
            <span>Ação destrutiva sem confirmação</span>
          </div>
        </div>
      </Section>
    </div>
  )
}
