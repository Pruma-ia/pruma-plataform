# src/app — Regras de Negócio

## Multi-tenant: isolamento obrigatório

Toda query deve filtrar por `organizationId` vindo de `session.user.organizationId`.
Nunca retornar dados cross-tenant. A única exceção é o superadmin via `/admin`.

## Superadmin (`/admin`)

- Painel **somente leitura** — superadmin não altera dados de clientes pelo UI.
- Rationale: sem log de auditoria rastreável ao cliente; risco de alteração acidental em org errada.
- Se precisar corrigir dado de cliente: orientar o próprio cliente, ou usar script de manutenção com log explícito.
- Acesso por URL: `/admin/orgs/[orgId]/*` — orgId vem do params, não da sessão.

## Fluxos (n8n)

- Criados/atualizados **exclusivamente pelo n8n** via webhook — nunca pelo usuário.
- `externalId` é o ID do fluxo no n8n, único por organização.
- Cada execução gera um `flowRun` com payload completo.

## Aprovações

- Criadas pelo n8n quando um fluxo precisa de decisão humana.
- `callbackUrl`: após aprovação/rejeição, o sistema POST de volta para o n8n continuar o fluxo.
- Rejeição exige comentário — validação obrigatória no cliente e no servidor.
- `canResolve={false}` no painel admin — aprovações são sempre read-only para superadmin.

## Billing (Asaas)

- Gateway brasileiro, suporte a PIX e boleto. Sandbox: `sandbox.asaas.com/api/v3`.
- Novos clientes iniciam com `subscriptionStatus = "trial"`.
- IDs Asaas ficam em `organizations` (`asaasCustomerId`, `asaasSubscriptionId`, `asaasPlanId`).
- Webhook Asaas atualiza `subscriptionStatus` automaticamente.

## Convenções de UI

- Server Components por padrão; `"use client"` só para eventos, estado ou browser APIs.
- Datas: `toLocaleString("pt-BR")` em todo o sistema.
- Todo texto de UI em português brasileiro.
