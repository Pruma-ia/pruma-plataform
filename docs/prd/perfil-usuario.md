# PRD — Página de Perfil do Usuário

**Status:** 📋 Pronto para dev | **Prioridade:** P1 | **Esforço estimado:** M (3–5 dias) | **RICE Score:** 333

---

## Problema

Usuários não conseguem atualizar seus dados pessoais após o cadastro. Nome incorreto, email desatualizado e falta de visibilidade sobre contas conectadas (Google / credentials) criam fricção e tickets de suporte desnecessários.

---

## Solução

Criar página `/settings/profile` onde o usuário edita seus dados pessoais e visualiza contas conectadas.

---

## Escopo

**Dentro:**
- Editar nome completo
- Editar telefone (campo novo no schema)
- Visualizar email (read-only — email é identidade, não editável)
- Visualizar contas conectadas: Google OAuth e/ou credentials (senha)
- Botão para desconectar Google (se tiver credentials como fallback)

**Fora:**
- Troca de email (requer verificação — escopo separado)
- Troca de senha (escopo separado)
- Upload de foto customizada (escopo separado)
- Notificações por email / preferências (escopo separado)

---

## Fluxo do usuário

```
/settings → aba "Perfil"
          → formulário: nome, telefone
          → seção "Contas conectadas": Google ✓ | Senha ✓/✗
          → salvar → feedback de sucesso
```

---

## Requisitos técnicos

| Item | Status |
|---|---|
| Campo `phone` em `users` (migration) | ❌ Falta |
| `GET /api/user/profile` — retorna dados do usuário logado | ❌ Falta |
| `PATCH /api/user/profile` — atualiza nome e telefone | ❌ Falta |
| Listagem de `accounts` vinculadas ao userId | ❌ Falta |
| Página `/settings/profile` | ❌ Falta |
| `session.user.name` atualizado após edição | ❌ Falta |

---

## Métricas de sucesso

- Tickets de suporte sobre dados pessoais: redução mensurável
- Taxa de preenchimento de telefone: >40% em 30 dias (útil para billing / contato)

---

## Riscos

| Risco | Mitigação |
|---|---|
| Usuário desconectar Google sem ter senha → sem acesso | Bloquear desconexão se credentials não cadastrada |
| Nome atualizado não refletir na sessão atual | Forçar refresh do JWT ou exibir aviso "ativo no próximo login" |

---

## Dependências

- Migration para adicionar `phone` em `users`
- Avatar feature recomendada antes (PRD avatar-google.md) — compartilha a seção de perfil
