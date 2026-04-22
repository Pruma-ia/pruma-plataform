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
- `prumaFlowId` é o ID estável definido pelo dev no `pruma.json`, único por organização.
- `n8nWorkflowId` é o ID gerado pelo n8n, pode mudar se o workflow for recriado — sempre atualizado no deploy.
- Cada execução gera um `flowRun` com payload completo.

## Integração n8n ↔ Pruma

- Orgs têm dois slugs separados: `slug` (URL, pode mudar por rebranding) e `n8nSlug` (imutável, identifica a org no n8n).
- `n8nSlug` é configurado pelo superadmin em `/admin/orgs/[orgId]/integrations` — nunca exposto ao cliente.
- Webhooks do n8n enviam `organizationSlug` que é resolvido contra `n8nSlug` (fallback para `slug` por retrocompatibilidade).
- Autenticação: header `x-n8n-secret` verificado por `verifyN8nSecret()` em todas as rotas `/api/n8n/*`.

## pruma-deploy-kit

- Tooling de deploy compartilhado entre todos os repos de clientes, distribuído como **git submodule**.
- Repo: `github.com/Pruma-ia/pruma-deploy-kit` — qualquer melhoria no kit propaga via `git submodule update --remote`.
- Cada repo cliente tem `pruma.json` com `organizationSlug`, `prumaApiUrl` e lista de `workflows`.
- Credenciais do cliente ficam em `.pruma-secrets` (nunca versionado) — configurado via `make pruma-init`.

## Aprovações

- Criadas pelo n8n quando um fluxo precisa de decisão humana.
- `callbackUrl`: após aprovação/rejeição, o sistema POST de volta para o n8n continuar o fluxo.
- Rejeição exige comentário — validação obrigatória no cliente e no servidor.
- `canResolve={false}` no painel admin — aprovações são sempre read-only para superadmin.
- `n8nExecutionId` é **obrigatório** no POST `/api/n8n/approvals` — string opaca gerada pelo n8n (qualquer formato). Tem constraint `unique` para idempotência: se o n8n retentar o webhook com o mesmo execution ID, a Pruma rejeita a duplicata em vez de criar duas aprovações.
- `callbackUrl` passa por duas validações: (1) blocklist SSRF em `validateCallbackUrl()` — rejeita IPs privados/localhost; (2) se a org tem `n8nBaseUrl` configurada, o hostname do `callbackUrl` deve ser o mesmo — evita que um payload malicioso redirecione callbacks para fora do n8n da org.

## Billing (Asaas)

- Gateway brasileiro, suporte a PIX e boleto. Sandbox: `sandbox.asaas.com/api/v3`.
- Novos clientes iniciam com `subscriptionStatus = "trial"`.
- IDs Asaas ficam em `organizations` (`asaasCustomerId`, `asaasSubscriptionId`, `asaasPlanId`).
- Webhook Asaas atualiza `subscriptionStatus` automaticamente.

## Convenções de UI

- Server Components por padrão; `"use client"` só para eventos, estado ou browser APIs.
- Datas: `toLocaleString("pt-BR")` em todo o sistema.
- Todo texto de UI em português brasileiro.
