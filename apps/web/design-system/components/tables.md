# Spec — Tabelas

## Estrutura

```
Toolbar (busca + filtros + CTA)
↓
div.rounded-xl.border.bg-card.shadow-md.overflow-hidden
  table.w-full.text-sm
    thead > tr.bg-muted/40.border-b
      th.px-4.py-3.text-left.font-medium.text-muted-foreground
    tbody.divide-y.divide-border
      tr.hover:bg-muted/30.transition-colors
        td.px-4.py-3
  div (paginação) .border-t.px-4.py-3
```

## Header de Coluna

- Texto: `text-muted-foreground font-medium text-sm`
- Com sorting: `<button>` com ícone `ArrowUpDown` ou `ChevronUp/Down`
- Background: `bg-muted/40`

## Linha

- Hover: `hover:bg-muted/30 transition-colors`
- Padding: `px-4 py-3`
- IDs/códigos: `font-mono text-xs text-muted-foreground`
- Título principal: `font-medium text-foreground`
- Subtítulo: `text-xs text-muted-foreground`

## Ações na Linha

```tsx
<td className="px-4 py-3 text-right">
  <div className="flex items-center justify-end gap-1">
    <Button variant="ghost" size="sm">Ver</Button>
    <Button variant="ghost" size="icon-sm">
      <MoreHorizontal />
    </Button>
  </div>
</td>
```

## Toolbar

```
flex items-center justify-between mb-3
  ├── esquerda: input.search + select (filtros)
  └── direita: Button "Criar novo"
```

## Paginação

```
flex items-center justify-between border-t px-4 py-3
  ├── "N resultados" (text-xs text-muted-foreground)
  └── botões Anterior | páginas | Próximo
```

## Estados Obrigatórios

- **Vazio**: colspam completo com ícone + mensagem + (ação opcional)
- **Loading**: skeleton com mesma estrutura da tabela real
- **Erro**: mensagem destrutiva + botão retry

## Regras

- Ação destrutiva na linha → abre confirm dialog (nunca executa diretamente)
- Coluna de ações sempre à direita
- Tabela dentro de `overflow-hidden rounded-xl` — nunca sem borda arredondada
