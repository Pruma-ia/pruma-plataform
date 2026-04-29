# Spec — Badges & Status

## Classe Base

```tsx
"inline-flex items-center rounded-sm border px-2.5 py-0.5 text-xs font-medium"
```

## Paleta de Status

| Status | Classes |
|---|---|
| Pendente / Aviso | `bg-amber-50 text-amber-700 border-amber-200` |
| Aprovado / Ativo / Sucesso | `bg-emerald-50 text-emerald-700 border-emerald-200` |
| Rejeitado / Erro / Falhou | `bg-red-50 text-red-700 border-red-200` |
| Trial / Info / Neutro | `bg-secondary text-secondary-foreground border-border` |
| Cancelado / Inativo | `bg-muted text-muted-foreground border-border` |
| Destaque / CTA | `bg-accent text-white border-accent` |
| Primário / Admin | `bg-primary text-primary-foreground border-primary` |

## Com Dot Indicator

```tsx
<span className="inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 border-emerald-200">
  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
  Online
</span>
```

Dot pulsante (processando): adicionar `animate-pulse` no dot.

## Regras

- Nunca inventar variante de cor não listada aqui
- Erros sempre na paleta `red-*` — nunca cor da marca
- Badge em tabela: sem padding de célula extra (o badge já tem o seu)
- Badge em card header: `shrink-0` para não comprimir
