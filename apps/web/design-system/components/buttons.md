# Spec — Botões

Componente: `src/components/ui/button.tsx` (base-ui + CVA)

## Variantes

| Variante | Uso | bg | text |
|---|---|---|---|
| `default` | Ação primária da tela — uma por tela | `bg-primary` | `text-primary-foreground` |
| `secondary` | Ação secundária | `bg-secondary` | `text-secondary-foreground` |
| `outline` | Ação terciária, cancelar | `border border-input bg-background` | `text-foreground` |
| `ghost` | Nav item, ação inline contextual | transparent | hover: `bg-muted` |
| `destructive` | Deletar, revogar, remover | `bg-destructive/10` | `text-destructive` |
| `link` | Link em texto corrido | transparent | `text-primary underline` |

## Tamanhos

| Size | Altura | Uso |
|---|---|---|
| `xs` | h-6 | Ações densas em tabelas, badges com ação |
| `sm` | h-7 | Toolbar, ações secundárias |
| `default` | h-8 | Padrão — formulários, cards, modais |
| `lg` | h-9 | CTAs principais, landing |
| `icon` | 32×32 | Ação de ícone sem label |
| `icon-sm` | 28×28 | Ação de ícone em tabela/card |
| `icon-xs` | 24×24 | Ação de ícone muito compacta |

## Estados Obrigatórios

- **Hover**: `transition-colors duration-150` (built-in no variant)
- **Focus**: `focus-visible:ring-3 ring-ring/50` — nunca remover
- **Loading**: `disabled + <Loader2 className="animate-spin" />`
- **Disabled**: `disabled:pointer-events-none disabled:opacity-50`

## Regras

1. Uma variante `default` por tela
2. Sempre `disabled` durante operação async — nunca deixar clicável
3. Ações destrutivas: `variant="destructive"` + confirm dialog obrigatório
4. Ícone à esquerda (ação de entrada), à direita (ação de saída/navegação)

## Exemplo

```tsx
// Correto
<Button variant="default">
  <Plus />
  Nova aprovação
</Button>

// Loading
<Button disabled>
  <Loader2 className="animate-spin" />
  Salvando...
</Button>

// Destrutivo com confirmação
<Button variant="destructive" onClick={() => setShowConfirm(true)}>
  <Trash2 />
  Excluir
</Button>
```
