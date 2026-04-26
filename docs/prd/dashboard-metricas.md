# PRD — Dashboard com Métricas Reais

**Status:** 📋 Pronto para dev | **Prioridade:** P1 | **Esforço estimado:** M (3–4 dias) | **RICE Score:** 280

---

## Problema

O módulo `/dashboard` existe mas provavelmente exibe estado vazio ou placeholder. Cliente que abre o painel pela primeira vez não entende o valor entregue. Dashboard vazio = produto que "não faz nada".

---

## Solução

Dashboard com KPIs reais da org: aprovações pendentes, resolvidas hoje, fluxos ativos, tempo médio de resolução. Foco em ação — o usuário deve saber imediatamente o que precisa fazer.

---

## Escopo

**Dentro:**
- Card: aprovações pendentes (com link direto para lista filtrada)
- Card: aprovações resolvidas hoje
- Card: fluxos ativos
- Card: tempo médio de resolução (últimos 30 dias)
- Lista: últimas 5 aprovações pendentes com CTA "Revisar"
- Empty state claro: "Nenhuma aprovação pendente — tudo em dia ✓"
- Onboarding checklist integrado (se org nova sem fluxos)

**Fora:**
- Gráficos históricos (escopo separado)
- Comparativo entre períodos
- Dashboard por fluxo específico
- Export de relatório do dashboard

---

## Fluxo do usuário

```
/dashboard
→ 4 KPI cards no topo
→ lista "Aprovações pendentes" (max 5, link "ver todas")
→ se org nova: checklist de configuração
→ se tudo resolvido: empty state positivo
```

---

## Requisitos técnicos

| Item | Status |
|---|---|
| `GET /api/dashboard/stats` — retorna KPIs da org | ❌ Falta |
| Query: count approvals por status (scoped por orgId) | ❌ Falta |
| Query: avg resolução últimos 30 dias | ❌ Falta |
| Query: count flows com status active | ❌ Falta |
| Página `/dashboard` substituir conteúdo atual | ❌ Falta |
| Componente KPI card (reutilizável) | ❌ Falta |

---

## Métricas de sucesso

- Bounce rate do dashboard: redução (usuário encontra o que fazer)
- Cliques em "Revisar" a partir do dashboard: proxy de engajamento

---

## Riscos

| Risco | Mitigação |
|---|---|
| Query lenta com muitas aprovações | Índices em `status` + `organizationId` + `createdAt` |
| Dashboard mostra dados de outra org | Sempre filtrar por `session.user.organizationId` |

---

## Dependências

- Nenhuma crítica — pode desenvolver em paralelo com outros PRDs
- Checklist de onboarding (`onboarding-checklist.md`) integrado aqui
