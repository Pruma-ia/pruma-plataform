# Spec — Empty States

## Estrutura Padrão

```tsx
<div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card px-8 py-16 text-center">
  <div className="rounded-full bg-muted p-4">
    <Icon className="h-8 w-8 text-muted-foreground" />
  </div>
  <h3 className="mt-4 font-heading text-base font-semibold text-foreground">
    Título descritivo
  </h3>
  <p className="mt-1 max-w-xs text-sm text-muted-foreground">
    Explica POR QUÊ está vazio e o que fazer.
  </p>
  <div className="mt-6">
    <Button variant="default">Ação principal</Button>
  </div>
</div>
```

## Variantes por Contexto

| Contexto | Ícone | Ação |
|---|---|---|
| Sem dados ainda | `ClipboardList` | CTA para criar primeiro item |
| Sem resultados de busca | `Search` | "Limpar filtros" (outline) |
| Sem permissão | `ShieldOff` | Nenhuma (sem ação) |
| Erro ao carregar | `AlertCircle` (vermelho) | "Tentar novamente" (outline) |

## Empty em Tabela

```tsx
<tbody>
  <tr>
    <td colSpan={N}>
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Icon className="h-8 w-8 text-muted-foreground/40" />
        <p className="mt-2 text-sm font-medium text-muted-foreground">Título</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Descrição curta</p>
      </div>
    </td>
  </tr>
</tbody>
```

## Regras

1. TODA listagem tem empty state antes de ir para produção
2. Descreve POR QUÊ está vazio (ex: "aguardando n8n" não só "sem dados")
3. Erro sempre usa paleta `destructive/5` + `destructive/20` border + retry
4. Sem permissão: nunca esconde o menu — explica o acesso
