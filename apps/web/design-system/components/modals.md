# Spec — Modais & Dialogs

## Estrutura

```
fixed inset-0 z-50 flex items-center justify-center
  ├── scrim: absolute inset-0 bg-black/50 (clique fecha)
  └── panel: relative z-10 w-full max-w-md rounded-xl border bg-card shadow-xl
       ├── header: flex justify-between border-b px-6 py-4
       │    ├── h3 font-heading text-base font-semibold
       │    └── button X (aria-label="Fechar")
       ├── body: px-6 py-5
       └── footer: flex justify-end gap-3 border-t px-6 py-4
            ├── Button outline "Cancelar" (esquerda)
            └── Button variant (direita)
```

## Larguras

| Uso | Max width |
|---|---|
| Confirmação simples | `max-w-sm` |
| Form / conteúdo padrão | `max-w-md` |
| Form complexo / detalhe | `max-w-lg` |
| Conteúdo rico | `max-w-2xl` |

## Modal Destrutivo

```tsx
// Header com ícone de alerta
<div className="flex items-center gap-3">
  <div className="rounded-lg bg-destructive/10 p-2">
    <AlertTriangle className="h-4 w-4 text-destructive" />
  </div>
  <h3>Título da ação destrutiva</h3>
</div>

// Footer
<Button variant="destructive">
  <Trash2 />
  Confirmar exclusão
</Button>
```

## Acessibilidade

```tsx
<div role="dialog" aria-modal aria-labelledby="modal-title">
  <h3 id="modal-title">...</h3>
</div>
```

## Regras

1. Scrim `bg-black/50` sempre — nunca transparente
2. Fechar: ESC + clique no scrim + botão X — todos os três
3. Cancelar à esquerda, confirmar à direita no footer
4. Ação destrutiva: `variant="destructive"` + ícone + confirmação textual (digitar nome)
5. Nunca usar modal para fluxo de navegação principal
6. Modal com form: confirmar salva, X cancela (verificar mudanças não salvas)
