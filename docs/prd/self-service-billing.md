# PRD — Self-Service Billing (Troca de Plano + Cancelamento)

**Status:** 📋 Pronto para dev | **Prioridade:** P1 | **Esforço estimado:** M (3–4 dias) | **RICE Score:** 165

---

## Problema

Cliente não consegue fazer upgrade, downgrade ou cancelar sem acionar suporte ou superadmin. Em SaaS, isso gera chargeback (cliente cancela no cartão ao invés de pelo produto) e NPS negativo.

---

## Solução

Fluxo self-service em `/billing` para trocar de plano e cancelar assinatura, integrado ao Asaas.

---

## Escopo

**Dentro:**
- Exibir plano atual com próxima cobrança e valor
- Botão "Fazer upgrade" → seleciona novo plano → confirma → Asaas atualiza subscription
- Botão "Cancelar assinatura" → modal de confirmação com consequências claras → Asaas cancela → status `canceled` ao fim do período
- Email de confirmação de cancelamento (via Resend)
- Acesso continua até `subscriptionEndsAt`
- Reativação: botão "Reativar assinatura" para status `canceled`

**Fora:**
- Prorated billing (Asaas não suporta facilmente — escopo separado)
- Pausa de assinatura
- Créditos / vouchers
- Múltiplos planos simultâneos

---

## Fluxo do usuário

```
/billing
→ card "Plano atual: Pro — R$297/mês — próxima cobrança: 15/05"
→ [Fazer upgrade] → modal com planos → confirmar → toast "Plano atualizado"
→ [Cancelar] → modal "Tem certeza? Acesso até DD/MM/AAAA" → confirmar → toast
→ status muda para "canceled" no próximo ciclo
```

---

## Requisitos técnicos

| Item | Status |
|---|---|
| `GET /api/billing/subscription` — retorna dados do plano atual (do Asaas) | ❌ Falta |
| `PATCH /api/billing/subscription` — troca de plano | ❌ Falta |
| `DELETE /api/billing/subscription` — cancela | ❌ Falta |
| Asaas: `PUT /subscriptions/{id}` para trocar plano | ❌ Verificar API |
| Asaas: `DELETE /subscriptions/{id}` para cancelar | ❌ Verificar API |
| Email de confirmação de cancelamento | ❌ Falta |
| UI em `/billing` (substituir tela atual) | ❌ Falta |

---

## Métricas de sucesso

- Chargebacks por "não consegui cancelar": zero
- Upgrades self-service: rastrear via events

---

## Riscos

| Risco | Mitigação |
|---|---|
| Cancelamento acidental | Modal com consequências explícitas + confirmação por digitação ("CANCELAR") |
| Asaas não cancela no momento certo | Webhook Asaas atualiza `subscriptionStatus` — já existe |
| Trial não tem subscription no Asaas | Caso especial: cancelar trial = apenas marcar `subscriptionStatus = canceled` |

---

## Dependências

- PRD Integração Asaas (`integracao-asaas.md`) — subscription criada lá
- Resend configurado para email de confirmação
