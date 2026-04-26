# PRD — Gestão de Aprovações: Filtros, Busca e Exportação

**Status:** 📋 Pronto para dev | **Prioridade:** P1 | **Esforço estimado:** M (3–4 dias) | **RICE Score:** 220

---

## Problema

Com volume de aprovações crescendo, a lista plana se torna inutilizável. Sem filtro por status, data ou fluxo, sem busca e sem exportação, o cliente não consegue auditar o histórico nem encontrar aprovações específicas.

---

## Solução

Adicionar filtros, busca e exportação CSV à página `/approvals`.

---

## Escopo

**Dentro:**
- Filtro por status: pending / approved / rejected
- Filtro por fluxo (dropdown com fluxos da org)
- Filtro por período: hoje / últimos 7 dias / últimos 30 dias / intervalo custom
- Busca por título (debounced, client-side para listas pequenas, server-side acima de 100)
- Paginação (20 por página)
- Exportação CSV: todas aprovações do filtro atual (título, fluxo, status, responsável, data, comentário)

**Fora:**
- Exportação PDF
- Filtro por membro específico que aprovou
- Saved filters / views

---

## Fluxo do usuário

```
/approvals
→ barra de filtros no topo: [Status ▾] [Fluxo ▾] [Período ▾] [🔍 Buscar]
→ lista filtrada + paginação
→ botão "Exportar CSV" → download imediato
```

---

## Requisitos técnicos

| Item | Status |
|---|---|
| Query params na URL: `?status=pending&flowId=xxx&from=2025-01-01` | ❌ Falta |
| `GET /api/approvals` com suporte a filtros (já existe?) | ❌ Verificar |
| Paginação com cursor ou offset | ❌ Falta |
| `GET /api/approvals/export` → stream CSV | ❌ Falta |
| Componentes de filtro client-side | ❌ Falta |

---

## Métricas de sucesso

- Tempo para encontrar aprovação específica: <10 segundos com filtros
- Uso de exportação: proxy de maturidade de uso

---

## Riscos

| Risco | Mitigação |
|---|---|
| Export grande trava Vercel (timeout 10s free tier) | Limitar export a 1000 registros por vez |
| Filtros cruzados complexos e query lenta | Índices compostos em `status`, `organizationId`, `createdAt`, `flowId` |

---

## Dependências

- Nenhuma crítica
