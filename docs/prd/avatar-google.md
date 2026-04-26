# PRD — Avatar do Google no Perfil

**Status:** ✅ Entregue | **Prioridade:** P2 | **Esforço estimado:** XS (< 1 dia) | **RICE Score:** 500

---

## Problema

Usuários que autenticam via Google não veem nenhuma representação visual de si mesmos no painel. A foto já é capturada pelo DrizzleAdapter no primeiro login, mas não é exibida em lugar algum. Interface parece impessoal e incompleta para usuários Google.

---

## Solução

Exibir o avatar do Google na sidebar do dashboard. Nenhum trabalho de backend — dado já está na tabela `users.image`.

---

## Escopo

**Dentro:**
- Avatar circular na sidebar (nome + foto do usuário logado)
- Fallback com inicial do nome quando sem foto (usuários credentials)

**Fora:**
- Upload de foto customizada (escopo separado)
- Avatar em outros contextos (aprovações, membros — já existe)

---

## Fluxo do usuário

```
Usuário loga com Google → abre dashboard → sidebar exibe foto + nome
Usuário loga com credentials → sidebar exibe inicial do nome em círculo colorido
```

---

## Requisitos técnicos

| Item | Status |
|---|---|
| `users.image` populado pelo DrizzleAdapter no Google OAuth | ✅ Pronto |
| `session.user.image` exposto pelo NextAuth | ❌ Verificar |
| Componente sidebar atualizado | ❌ Falta |

---

## Métricas de sucesso

- Foto visível para 100% dos usuários Google após login
- Zero regressões em usuários credentials (fallback funcional)

---

## Riscos

| Risco | Mitigação |
|---|---|
| URL da foto Google expirar | Google URLs de foto são estáveis enquanto conta ativa — aceitável |
| `session.user.image` não tipado em `next-auth.d.ts` | Adicionar ao tipo antes de usar |

---

## Dependências

- Nenhuma externa — tudo já disponível no stack atual
