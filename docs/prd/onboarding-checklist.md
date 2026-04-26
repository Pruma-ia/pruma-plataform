# PRD — Onboarding Checklist

**Status:** 📋 Pronto para dev | **Prioridade:** P1 | **Esforço estimado:** S (1–2 dias) | **RICE Score:** 200

---

## Problema

Novos clientes não sabem o que fazer após criar conta. O produto depende de configurar n8n, criar fluxos e testar aprovações — sem guia, o cliente trava no primeiro acesso e abandona antes de ver valor.

---

## Solução

Checklist de primeiros passos no dashboard, visível até completar todos os itens.

---

## Escopo

**Dentro:**
- Checklist com 5 steps no dashboard (apenas para orgs novas / sem flows)
- Steps: verificar email → completar dados da org → convidar primeiro membro → configurar n8n (link para docs) → aguardar primeiro fluxo
- Barra de progresso (ex: "3/5 completos")
- Cada step verificado automaticamente (server-side, não depende de clique)
- Dismissível após 100% completo (ou manualmente após 3 dias)

**Fora:**
- Tour guiado interativo (tooltip walkthrough) — escopo separado
- Checklist por membro (não owner) — escopo separado

---

## Steps e como verificar

| Step | Verificação |
|---|---|
| Verificar email | `users.emailVerified IS NOT NULL` |
| Completar dados da org | `organizations.cnpj IS NOT NULL` |
| Convidar primeiro membro | `count(organizationMembers) > 1` |
| Conectar n8n | `organizations.n8nBaseUrl IS NOT NULL` |
| Primeira aprovação recebida | `count(approvals) > 0` |

---

## Requisitos técnicos

| Item | Status |
|---|---|
| `GET /api/dashboard/onboarding-progress` — retorna steps completos | ❌ Falta |
| Componente `OnboardingChecklist` no dashboard | ❌ Falta |
| Lógica de dismiss (localStorage ou campo `onboardingDismissedAt` em orgs) | ❌ Falta |

---

## Métricas de sucesso

- Taxa de conclusão do checklist em 7 dias: >50%
- Correlação: orgs que completam checklist têm churn menor (medir em 90 dias)

---

## Riscos

| Risco | Mitigação |
|---|---|
| Checklist aparece para orgs antigas ativas | Mostrar só se `organizations.createdAt` < 7 dias ou se `count(approvals) == 0` |

---

## Dependências

- PRD Verificação de Email (`verificacao-email-telefone.md`)
- PRD Onboarding Dados Cadastrais (`onboarding-org-dados-cadastrais.md`)
- Dashboard Métricas (`dashboard-metricas.md`) — integrado lá
