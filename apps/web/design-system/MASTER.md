# Pruma IA — Design System Master

Fonte da verdade visual. Toda nova tela e componente parte daqui.
Tokens mapeados de `globals.css` + shadcn/ui + convenções do produto.

---

## Identidade

| Atributo | Valor |
|---|---|
| Produto | SaaS B2B — painel de aprovações humanas |
| Público | Gestores e operadores (desktop-first) |
| Tom | Profissional, confiável, direto |
| Estilo | Clean corporate com accents ciano |

---

## Cores

### Paleta de Marca

| Nome | Hex | Token CSS | Uso |
|---|---|---|---|
| Azul Marinho | `#0D1B4B` | `--primary` / `bg-primary` | Backgrounds escuros, sidebar, texto primário |
| Azul Médio | `#162460` | `--sidebar-accent` | Hover state na sidebar |
| Azul Profundo | `#1E3080` | `--chart-3` | Gradientes, elementos secundários escuros |
| Ciano Elétrico | `#00AEEF` | `--accent` / `bg-accent` | CTAs, status positivo, links, ring de foco |
| Ciano Claro | `#5CCFF5` | `--chart-2` | Soft highlights, ícones decorativos |
| Ciano Pálido | `#E0F6FE` | `--secondary` | Badge backgrounds, chips, bg de destaque suave |

### Tokens Semânticos (light mode)

| Token | Valor oklch | Uso |
|---|---|---|
| `--background` | `oklch(0.965 0.008 264)` | Fundo da página (off-white azulado) |
| `--foreground` | `oklch(0.198 0.116 264.1)` | Texto principal (Azul Marinho) |
| `--card` | `oklch(1 0 0)` | Card branco, flutua acima do background |
| `--card-foreground` | `oklch(0.198 0.116 264.1)` | Texto dentro de cards |
| `--primary` | `oklch(0.198 0.116 264.1)` | Botão primário bg |
| `--primary-foreground` | `oklch(1 0 0)` | Texto em botão primário (branco) |
| `--secondary` | `oklch(0.965 0.028 211.5)` | Botão secondary bg (Ciano Pálido) |
| `--secondary-foreground` | `oklch(0.198 0.116 264.1)` | Texto em botão secondary |
| `--muted` | `oklch(0.965 0.028 211.5)` | Backgrounds de input, seções mutadas |
| `--muted-foreground` | `oklch(0.45 0.06 264)` | Texto secundário, placeholders |
| `--accent` | `oklch(0.673 0.161 211.4)` | Ciano Elétrico — ações, foco, highlights |
| `--accent-foreground` | `oklch(1 0 0)` | Texto sobre accent (branco) |
| `--destructive` | `oklch(0.577 0.245 27.325)` | Erros, ações destrutivas (vermelho) |
| `--border` | `oklch(0.88 0.02 264)` | Bordas de inputs e cards |
| `--ring` | `oklch(0.673 0.161 211.4)` | Focus ring — Ciano Elétrico |

### Regra de Cor

- **Erros sempre vermelho** (`--destructive`) — nunca substituir por cor da marca
- **Sucesso**: `text-emerald-600` / `bg-emerald-50`
- **Aviso**: `text-amber-600` / `bg-amber-50`
- **Info**: `text-accent` / `bg-secondary`
- Nunca usar hex hardcoded em componentes — sempre token ou classe Tailwind semântica

---

## Tipografia

### Fontes

| Função | Família | Token | Peso |
|---|---|---|---|
| Headings | Barlow | `font-heading` / `var(--font-barlow)` | 600, 700 |
| Body | Inter | `font-sans` / `var(--font-inter)` | 400, 500 |
| Mono | Geist Mono | `font-mono` | 400 |

### Escala de Tipo

| Classe Tailwind | px | rem | Uso |
|---|---|---|---|
| `text-xs` | 12px | 0.75 | Labels, captions, badges |
| `text-sm` | 14px | 0.875 | Body secundário, inputs, tabelas |
| `text-base` | 16px | 1 | Body principal |
| `text-lg` | 18px | 1.125 | Subtítulos, intro text |
| `text-xl` | 20px | 1.25 | Seção title |
| `text-2xl` | 24px | 1.5 | Page title (h2) |
| `text-3xl` | 30px | 1.875 | Hero title (h1) |
| `text-4xl` | 36px | 2.25 | Display — landing pages |

### Pesos

| Tailwind | Valor | Uso |
|---|---|---|
| `font-normal` | 400 | Body, descrições |
| `font-medium` | 500 | Labels, nav items ativos |
| `font-semibold` | 600 | Headings, botões, CTAs |
| `font-bold` | 700 | Hero titles, destaque crítico |

### Line Height

- Body: `leading-relaxed` (1.625) — leitura longa
- UI: `leading-snug` (1.375) — labels, botões
- Mono: `leading-normal` (1.5)

---

## Espaçamento

Sistema base 4px (Tailwind spacing scale).

| Token | px | Uso |
|---|---|---|
| `space-1` | 4px | Micro gap (ícone + label) |
| `space-2` | 8px | Gap interno de componente |
| `space-3` | 12px | Padding de badge, chip |
| `space-4` | 16px | Padding padrão de card, input |
| `space-6` | 24px | Gap entre campos de form |
| `space-8` | 32px | Gap entre seções |
| `space-12` | 48px | Gap entre blocos de página |
| `space-16` | 64px | Seções hero |

### Padding de Componentes

| Componente | Padding |
|---|---|
| Botão sm | `px-3 py-1.5` |
| Botão md (default) | `px-4 py-2` |
| Botão lg | `px-6 py-3` |
| Input | `px-3 py-2` |
| Card | `p-6` |
| Modal | `p-6` |
| Table cell | `px-4 py-3` |
| Badge | `px-2 py-0.5` |

---

## Border Radius

Token base: `--radius: 0.625rem` (10px)

| Token | Valor | Uso |
|---|---|---|
| `rounded-sm` | `calc(var(--radius) * 0.6)` ≈ 6px | Badges, chips pequenos |
| `rounded-md` | `calc(var(--radius) * 0.8)` ≈ 8px | Inputs, selects |
| `rounded-lg` | `var(--radius)` = 10px | Cards, botões padrão |
| `rounded-xl` | `calc(var(--radius) * 1.4)` ≈ 14px | Modais, painéis |
| `rounded-2xl` | `calc(var(--radius) * 1.8)` ≈ 18px | Sheets, drawers |
| `rounded-full` | 9999px | Avatar, status dot |

---

## Sombras (Elevação)

| Nível | Classe Tailwind | Uso |
|---|---|---|
| 0 | `shadow-none` | Itens inline, sem elevação |
| 1 | `shadow-sm` | Inputs em foco, badges elevados |
| 2 | `shadow-md` | Cards, dropdown triggers |
| 3 | `shadow-lg` | Dropdowns abertos, popovers |
| 4 | `shadow-xl` | Modais, dialogs |

Sidebar não usa sombra — separação por cor de fundo.

---

## Componentes — Referência Rápida

> Specs completas em `design-system/components/*.md`

### Botões

| Variante | Classe base | Quando usar |
|---|---|---|
| `default` | bg-primary text-primary-foreground | Ação principal da tela |
| `secondary` | bg-secondary text-secondary-foreground | Ação secundária |
| `outline` | border border-input bg-background | Ação terciária, cancelar |
| `ghost` | hover:bg-accent/10 | Nav item, ação inline |
| `destructive` | bg-destructive text-white | Deletar, revogar |
| `link` | text-accent underline | Link em texto |

**Regra**: uma ação primária por tela. Demais ações: secondary ou outline.

### Status Badges

| Status | Classe |
|---|---|
| Pendente | `bg-amber-50 text-amber-700 border-amber-200` |
| Aprovado | `bg-emerald-50 text-emerald-700 border-emerald-200` |
| Rejeitado | `bg-red-50 text-red-700 border-red-200` |
| Trial | `bg-secondary text-secondary-foreground` |
| Ativo | `bg-emerald-50 text-emerald-700` |
| Cancelado | `bg-muted text-muted-foreground` |

### Estados Obrigatórios por Componente

Todo componente com dados deve ter:
- **Loading**: skeleton ou spinner
- **Empty**: mensagem útil + ação
- **Error**: mensagem + botão retry
- **Populated**: estado normal

---

## Layout de Página

### Grid

- Sidebar: 256px (fixed)
- Content area: flex-1, `max-w-7xl` em páginas largas
- Padding interno: `p-6` a `p-8`

### Hierarquia de Página

```
Page Header
  └── Title (text-2xl font-semibold font-heading)
  └── Subtitle (text-sm text-muted-foreground) [opcional]
  └── Actions (botões alinhados à direita)

Content
  └── Seções separadas por gap-8
  └── Cards: bg-card rounded-xl shadow-md p-6
```

### Responsividade

Produto desktop-first (SaaS B2B). Breakpoints mínimos:
- `lg` (1024px): layout sidebar + content
- `md` (768px): sidebar colapsada, content full-width
- `sm` (640px): não suportado oficialmente — avisar usuário

---

## Padrões de Interação

| Evento | Comportamento |
|---|---|
| Hover em botão | `transition-colors duration-150` |
| Focus | Ring 2px Ciano Elétrico (`ring-2 ring-ring`) |
| Loading (submit) | Botão `disabled` + spinner Lucide `Loader2 animate-spin` |
| Toast sucesso | `duration-3000`, auto-dismiss |
| Toast erro | `duration-5000`, manual dismiss |
| Confirmação destrutiva | Dialog obrigatório — nunca delete sem confirm |

---

## Acessibilidade (Regras Mínimas)

- `htmlFor` + `id` em todo par label/input
- `autoComplete` semântico em campos de auth e dados pessoais
- `role="alert"` em mensagens de erro dinâmicas
- `aria-describedby` quando há texto auxiliar visível
- Contraste mínimo 4.5:1 (texto normal), 3:1 (texto grande)
- Focus ring sempre visível — nunca `outline-none` sem substituto

---

## Anti-Patterns

- ❌ Hex hardcoded em className (usar token)
- ❌ Emoji como ícone de UI (usar Lucide)
- ❌ Misturar variantes de ícone (outline + filled na mesma hierarquia)
- ❌ Deletar sem dialog de confirmação
- ❌ Componente sem estado empty/loading/error
- ❌ Cor da marca para estado de erro (sempre vermelho semântico)
- ❌ `"use client"` em componente que não precisa (custo de bundle)
- ❌ Texto de UI em inglês (todo UI em português brasileiro)

---

## Como Usar nas Tasks

1. Abrir este arquivo antes de implementar qualquer tela
2. Ver `design-system/components/<padrão>.md` para o componente específico
3. Conferir screenshots de referência em `tests/e2e/screenshots/design-preview/`
4. Implementar seguindo tokens — não inventar variantes
5. Playwright confirma visual antes do PR

---

## Referências de Preview

Rodar `npm run dev` e acessar `/design-preview` para ver todos os padrões renderizados ao vivo.

Screenshots gerados: `tests/e2e/screenshots/design-preview/`
