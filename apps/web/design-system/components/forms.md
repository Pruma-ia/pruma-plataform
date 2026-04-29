# Spec — Inputs & Forms

## Anatomia de Campo

```
<label htmlFor="field-id">
  Label <span aria-hidden>*</span>   ← obrigatório
</label>
<input
  id="field-id"
  type="text"
  autoComplete="name"              ← semântico sempre
  aria-describedby="field-helper"  ← quando há helper text
/>
<p id="field-helper">Texto auxiliar</p>
<p role="alert">Mensagem de erro</p>  ← aparece no blur, não no keystroke
```

## Classes Base

```tsx
const inputBase = "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

const inputError = "border-destructive focus-visible:ring-destructive/30"
```

## autoComplete Semântico

| Campo | Valor |
|---|---|
| Nome | `given-name` |
| Sobrenome | `family-name` |
| Nome completo | `name` |
| Organização | `organization` |
| E-mail | `email` |
| Telefone | `tel` |
| Nova senha | `new-password` |
| Senha atual | `current-password` |
| CNPJ/CPF | `off` (documentos não têm valor padrão) |

## Regras Obrigatórias

1. `htmlFor` + `id` em TODO par label/input
2. Campos obrigatórios marcados com `*` (vermelho, `aria-hidden`)
3. Erros: `role="alert"`, abaixo do campo, visível no blur (não no keystroke)
4. Campos desabilitados: `disabled` semântico (não só visual)
5. Password: toggle show/hide com `aria-label` descritivo
6. `autoComplete` semântico em todos os campos de auth e dados pessoais

## Layout de Form

```
Card > form > space-y-5
  ├── grid gap-4 sm:grid-cols-2   (campos lado a lado em desktop)
  ├── campo único                  (ocupa full width)
  └── footer: [Salvar] [Cancelar] (salvar à esquerda)
```

## Estados de Validação

```tsx
// Error
<input
  aria-invalid
  aria-describedby="field-error"
  className={`${inputBase} ${inputError}`}
/>
<p id="field-error" role="alert" className="mt-1 flex items-center gap-1 text-xs text-destructive">
  <AlertCircle className="h-3 w-3 shrink-0" />
  Mensagem específica do erro. Como corrigir.
</p>
```
