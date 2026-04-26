# PRD — Audit Log de Aprovações

**Status:** 📋 Pronto para dev | **Prioridade:** P1 | **Esforço estimado:** M (3 dias) | **RICE Score:** 180

---

## Problema

Clientes B2B precisam saber quem aprovou o quê, quando e com qual comentário — para compliance interno, auditoria e rastreabilidade. Sem isso, o produto não serve para empresas com processos regulados.

---

## Solução

Tela de histórico de aprovações com todos os eventos de decisão: quem aprovou/rejeitou, quando, comentário, campos de decisão preenchidos.

---

## Escopo

**Dentro:**
- Página `/approvals/[id]` já deve mostrar histórico de decisão da aprovação
- Nova seção no detalhe da aprovação: linha do tempo de eventos (criada, visualizada?, aprovada/rejeitada)
- Página `/audit` ou aba em `/approvals`: lista de todas as aprovações resolvidas com filtros (PRD filtros)
- Dados exibidos: responsável (nome + avatar), timestamp, status, comentário, campos de decisão

**Fora:**
- Log de eventos de sistema (login, mudança de role) — escopo separado
- Exportação de audit log (coberto pelo PRD filtros + CSV)
- Assinatura digital das decisões

---

## Requisitos técnicos

| Item | Status |
|---|---|
| `approvals.resolvedBy`, `resolvedAt`, `comment` já existem | ✅ Existe |
| `approvals.decisionValues` já existe | ✅ Existe |
| Linha do tempo no detalhe `/approvals/[id]` | ❌ Falta |
| Página `/approvals/history` ou aba "Histórico" | ❌ Falta |
| Join com `users` para nome/avatar do resolvedor | ❌ Falta |

---

## Métricas de sucesso

- Aprovações com audit trail completo: 100% (dados já existem no banco)
- Pedidos de "quem aprovou X": resolvidos pelo cliente sem suporte

---

## Riscos

| Risco | Mitigação |
|---|---|
| Dados de decisão de orgs diferentes expostos | Sempre filtrar por `organizationId` |

---

## Dependências

- PRD Filtros e Busca (`gestao-aprovacoes-filtros.md`) — mesma tela
