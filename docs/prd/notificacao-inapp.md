# PRD — Notificação In-App (Bell Icon)

**Status:** 📋 Pronto para dev | **Prioridade:** P2 | **Esforço estimado:** M (3–4 dias) | **RICE Score:** 120

---

## Problema

Usuário que está com o painel aberto não recebe nenhum sinal de nova aprovação. Depende de email ou de recarregar a página. Experiência inferior ao esperado por qualquer produto SaaS moderno.

---

## Solução

Bell icon no header com contador de não-lidas e dropdown de notificações recentes. Polling simples (sem WebSocket em v1).

---

## Escopo

**Dentro:**
- Tabela `notifications` (userId, orgId, type, title, body, readAt, link, createdAt)
- Bell icon no header com badge de contagem não-lidas
- Dropdown: últimas 10 notificações, com link direto para aprovação
- Marcar como lida ao clicar
- "Marcar todas como lidas"
- Polling a cada 30s (client-side, simples)
- Tipos v1: `approval_pending`, `approval_resolved` (resolvida por outro membro), `approval_expired`

**Fora:**
- WebSocket / Server-Sent Events (escopo futuro se polling não escalar)
- Preferências por tipo de notificação
- Push notification mobile

---

## Requisitos técnicos

| Item | Status |
|---|---|
| Tabela `notifications` (migration) | ❌ Falta |
| `GET /api/notifications` — lista não-lidas | ❌ Falta |
| `PATCH /api/notifications/read-all` | ❌ Falta |
| `PATCH /api/notifications/[id]/read` | ❌ Falta |
| Inserção de notificação ao criar approval (junto ao email) | ❌ Falta |
| Componente bell + dropdown no header | ❌ Falta |
| Polling com `useEffect` + `setInterval(30s)` | ❌ Falta |

---

## Métricas de sucesso

- Taxa de abertura de notificação in-app vs email: comparar canais
- Tempo médio de resolução: redução com in-app vs sem

---

## Riscos

| Risco | Mitigação |
|---|---|
| Polling a cada 30s sobrecarrega DB com muitos usuários | Rate limit por usuário; migrar para SSE quando escalar |
| Notificações de org diferente expostas | Sempre filtrar por `userId` + `orgId` |

---

## Dependências

- Email de aprovação pendente (`email-aprovacao-pendente.md`) — mesma inserção cria notificação in-app
- Header component existente — adicionar bell icon
