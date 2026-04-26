# PRD — Integração Asaas

**Status:** 📝 PRD pendente (rascunho) | **Prioridade:** P1 | **Esforço estimado:** L | **RICE Score:** 300

> PRD em rascunho — preencher com detalhes do produto antes de iniciar dev.

---

## Problema

[Descrever: qual problema de billing ou pagamento está bloqueando crescimento ou gerando atrito para clientes.]

---

## Solução

[Descrever: o que será construído. Integração nativa com Asaas para PIX/boleto, criação de assinaturas, webhooks de status.]

---

## Escopo

**Dentro:**
- [ ] Checkout via Asaas (PIX e/ou boleto)
- [ ] Criação de assinatura vinculada à organização
- [ ] Webhook Asaas → atualiza `subscriptionStatus` no banco
- [ ] Portal do cliente (cancelar, alterar plano)

**Fora:**
- [ ] Cartão de crédito (definir se entra no MVP)
- [ ] Múltiplas assinaturas por organização

---

## Fluxo do usuário

```
[Preencher com o fluxo de checkout e gestão de assinatura]
```

---

## Requisitos técnicos

| Item | Status |
|---|---|
| `lib/asaas.ts` existente | ✅ Verificar |
| Webhook `/api/webhooks/asaas` | ✅ Verificar |
| Rota `/api/billing/checkout` | ✅ Verificar |
| Rota `/api/billing/portal` | ✅ Verificar |
| Env vars Asaas em prod | ❌ Verificar |

---

## Métricas de sucesso

- [ ] Definir métricas antes de iniciar dev

---

## Riscos

| Risco | Mitigação |
|---|---|
| Webhook Asaas sem verificação de assinatura | Validar HMAC no handler |
| Status de assinatura desatualizado no JWT | Refresh automático a cada 5 min (já implementado) |

---

## Dependências

- Conta Asaas produção com acesso à API
- Definir planos e preços antes de iniciar
