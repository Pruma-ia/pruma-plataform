# PRD — Gestão de Senha (Recuperação + Troca)

**Status:** ✅ Entregue | **Prioridade:** P0 | **Esforço estimado:** S (2–3 dias) | **RICE Score:** 450

---

## Problema

Usuários com login por credentials não conseguem recuperar nem trocar a senha. Conta bloqueada = suporte manual. Básico de auth que toda plataforma precisa ter no dia 1.

---

## Solução

Fluxo completo de recuperação via email (token de uso único + TTL) e página de troca de senha em `/settings/profile`.

---

## Escopo

**Dentro:**
- `/login` → link "Esqueci minha senha"
- `POST /api/auth/forgot-password` — recebe email, gera token, envia email com link
- Página `/reset-password?token=xxx` — formulário nova senha
- `POST /api/auth/reset-password` — valida token, atualiza senha, invalida token
- Troca de senha em `/settings/profile` (usuário logado): senha atual + nova + confirmação
- `PATCH /api/user/password` — valida senha atual, atualiza

**Fora:**
- Magic link (login sem senha) — escopo separado
- Reset forçado pelo admin — escopo separado
- Histórico de senhas (impede reuso) — escopo separado

---

## Fluxo do usuário

```
Recuperação:
/login → "Esqueci minha senha" → email → link /reset-password?token=xxx
→ nova senha → redirect /login → login com nova senha

Troca (logado):
/settings/profile → "Alterar senha" → senha atual + nova + confirmar
→ salvar → feedback sucesso
```

---

## Requisitos técnicos

| Item | Status |
|---|---|
| Tabela `password_reset_tokens` (userId, tokenHash, expiresAt, usedAt) | ❌ Falta |
| `POST /api/auth/forgot-password` | ❌ Falta |
| `POST /api/auth/reset-password` | ❌ Falta |
| `PATCH /api/user/password` | ❌ Falta |
| Página `/reset-password` | ❌ Falta |
| Link "Esqueci minha senha" no `/login` | ❌ Falta |
| Email de reset via Resend (mesmo provider de notificações) | ❌ Falta |
| Token: SHA-256, TTL 1h, uso único | ❌ Falta |

### Segurança obrigatória
- Token gerado com `crypto.randomBytes(32)` — nunca sequencial
- Apenas hash SHA-256 armazenado no banco (nunca o token raw)
- Resposta do endpoint é sempre 200 mesmo se email não existe (evita user enumeration)
- Rate limit: máx 3 requests por email por hora
- Invalidar token após uso

---

## Métricas de sucesso

- Tickets de "não consigo acessar minha conta": redução a zero
- Taxa de conclusão do fluxo de reset: >80%

---

## Riscos

| Risco | Mitigação |
|---|---|
| Link de reset interceptado | TTL curto (1h) + uso único + HTTPS obrigatório |
| User enumeration via resposta diferente | Sempre retornar 200 independente de o email existir |
| Usuário Google sem senha tenta trocar | Ocultar seção "Alterar senha" para usuários sem `password` no banco |

---

## Dependências

- Resend configurado (`email-aprovacao-pendente.md`) — mesmo provider
- `/settings/profile` (PRD `perfil-usuario.md`) — UI de troca integrada lá
