# PRD — SLA / Deadline de Aprovação

**Status:** 📋 Pronto para dev | **Prioridade:** P2 | **Esforço estimado:** M (3–4 dias) | **RICE Score:** 140

---

## Problema

Aprovações sem prazo ficam pendentes indefinidamente. Fluxos n8n que aguardam callback travam por dias se o aprovador não ver a notificação. Sem SLA, o produto não serve para processos com urgência.

---

## Solução

n8n pode definir `expiresAt` ao criar aprovação. Se não resolvida no prazo, sistema rejeita automaticamente e notifica. Email de lembrete 1h antes do deadline.

---

## Escopo

**Dentro:**
- Campo `expiresAt` opcional no `POST /api/n8n/approvals`
- Cron diário (ou a cada hora): busca aprovações `pending` com `expiresAt < now()` → auto-rejeita com `comment = "Expirado automaticamente"`  → dispara callback n8n
- Email de lembrete 1h antes do vencimento para aprovadores
- Badge visual na UI: "Expira em 2h" (vermelho se < 1h)
- Aprovação expirada: status visual distinto (`expired`) ou `rejected` com flag

**Fora:**
- Escalação automática para outro membro (escopo separado)
- SLA configurável por fluxo/org via UI (v1: só via n8n payload)
- Extensão de prazo pelo aprovador

---

## Fluxo do usuário

```
n8n → POST /api/n8n/approvals com expiresAt: "2025-05-10T18:00:00Z"
→ aprovação criada com deadline
→ lista /approvals: badge "Expira em 2h"
→ 1h antes: email "Aprovação pendente — expira em 1h"
→ se não resolvida: cron auto-rejeita → callback n8n com status=rejected, comment="Expirado"
```

---

## Requisitos técnicos

| Item | Status |
|---|---|
| Campo `expiresAt` em `approvals` (migration) | ❌ Falta |
| `POST /api/n8n/approvals` aceitar `expiresAt` | ❌ Falta |
| Cron de expiração (GitHub Actions `*/30 * * * *` ou Vercel cron diário) | ❌ Falta |
| Query: `SELECT * FROM approvals WHERE status='pending' AND expires_at < now()` | ❌ Falta |
| Email de lembrete 1h antes (Resend) | ❌ Falta |
| Badge de urgência na UI | ❌ Falta |

---

## Métricas de sucesso

- Aprovações expiradas sem resolução humana: rastreáveis
- Fluxos n8n travados por aprovação pendente > 24h: redução a zero

---

## Riscos

| Risco | Mitigação |
|---|---|
| Cron Vercel free: só `0 X * * *` (1x/dia) | Usar GitHub Actions scheduled para frequência maior |
| Auto-rejeição sem notificação antes | Email de lembrete é obrigatório, não opcional |
| `expiresAt` no passado ao criar | Validar: `expiresAt > now() + 5min` |

---

## Dependências

- Resend configurado (`email-aprovacao-pendente.md`)
- GitHub Actions scheduler (workaround Vercel cron limitação — já documentado em CLAUDE.md)
