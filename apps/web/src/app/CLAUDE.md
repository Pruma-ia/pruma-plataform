# src/app — Regras de Negócio

## Multi-tenant: isolamento obrigatório

Toda query filtra por `organizationId` de `session.user.organizationId`.
Nunca retornar dados cross-tenant. Exceção única: superadmin via `/admin`.

## Superadmin (`/admin`)

- Painel **somente leitura** — superadmin não altera dados de clientes pelo UI.
- Rationale: sem log de auditoria rastreável ao cliente; risco de alteração acidental em org errada.
- Correção de dado de cliente: orientar o próprio cliente, ou usar script de manutenção com log explícito.
- Acesso por URL: `/admin/orgs/[orgId]/*` — orgId vem do params, não da sessão.

## Notificações por email

Email disparado em `POST /api/n8n/approvals` após inserção da aprovação no banco.

- **Destinatários:** `organizationMembers` JOIN `users` WHERE `emailVerified IS NOT NULL`. Membros sem email verificado não recebem.
- **Fire-and-forget:** `void Promise.allSettled(...)` — falha de email não bloqueia a resposta da rota nem cancela a aprovação.
- **Campos n8n no template** (`title`, `description`, `flowName`, `filenames`) passam por `escapeHtml()` antes da interpolação — n8n é fonte autenticada mas não confiável para HTML.
- **Adicionar novo tipo de email:** criar função `build*Html` + `send*Email` em `src/lib/email.ts` seguindo o mesmo padrão. Não chamar `resend` ou `nodemailer` diretamente — usar `sendEmail()` interno.

## Fluxos (n8n)

- Criados/atualizados **exclusivamente pelo n8n** via webhook — nunca pelo usuário.
- `prumaFlowId` = ID estável definido pelo dev no `pruma.json`, único por organização.
- `n8nWorkflowId` = ID gerado pelo n8n, pode mudar se workflow recriado — sempre atualizado no deploy.
- Cada execução gera `flowRun` com payload completo.

## Integração n8n ↔ Pruma

- Orgs têm dois slugs: `slug` (URL, pode mudar por rebranding) e `n8nSlug` (imutável, identifica org no n8n).
- `n8nSlug` configurado pelo superadmin em `/admin/orgs/[orgId]/integrations` — nunca exposto ao cliente.
- Webhooks n8n enviam `organizationSlug` resolvido contra `n8nSlug` (fallback para `slug` por retrocompatibilidade).
- Auth: header `x-n8n-secret` verificado por `verifyN8nSecret()` em todas as rotas `/api/n8n/*`.

## pruma-deploy-kit

- Tooling de deploy compartilhado entre todos repos de clientes, distribuído como **git submodule**.
- Repo: `github.com/Pruma-ia/pruma-deploy-kit` — melhorias propagam via `git submodule update --remote`.
- Cada repo cliente tem `pruma.json` com `organizationSlug`, `prumaApiUrl` e lista de `workflows`.
- Credenciais do cliente em `.pruma-secrets` (nunca versionado) — configurado via `make pruma-init`.

## Aprovações

- Criadas pelo n8n quando fluxo precisa de decisão humana.
- `callbackUrl`: após aprovação/rejeição, sistema POST de volta para n8n continuar fluxo.
- Rejeição exige comentário — validação obrigatória no cliente e no servidor.
- `canResolve={false}` no painel admin — aprovações sempre read-only para superadmin.
- `n8nExecutionId` **obrigatório** no POST `/api/n8n/approvals` — string opaca gerada pelo n8n (qualquer formato). Constraint `unique` para idempotência: n8n retentando webhook com mesmo execution ID → Pruma rejeita duplicata em vez de criar duas aprovações.
- `callbackUrl` passa por duas validações: (1) blocklist SSRF em `validateCallbackUrl()` — rejeita IPs privados/localhost; (2) se org tem `n8nBaseUrl` configurada, hostname do `callbackUrl` deve ser o mesmo — evita payload malicioso redirecionando callbacks para fora do n8n da org.

### Aprovações ricas — anexos e campos de decisão

Aprovações podem carregar arquivos e campos de decisão estruturados além do approve/reject simples.

**Campos de decisão** (`decisionFields` / `decisionValues`):
- n8n define campos ao criar aprovação: `[{ id, type: "select", label, options: [{id, label}] }]`
- IDs dos campos e opções são de propriedade do n8n — Pruma armazena e devolve sem interpretar.
- Aprovador preenche na UI → `decisionValues: { fieldId: optionId }` salvo e enviado no callback.
- Tipos v1: apenas `select`. `date` e `text` livre diferenciado de `comment` ficam fora do escopo.
- `comment` já existente serve como campo de texto livre sempre presente — não criar campo duplicado.

**Anexos** (`approval_files`):
- Upload via presigned URL (Cloudflare R2) — arquivo nunca passa pelo servidor Pruma.
- Razão: Vercel free tier limita body a 4.5MB; arquivos autenticados (Gmail, Drive) não são acessíveis via URL pelo Pruma.
- Fluxo: (1) n8n chama `POST /api/n8n/approvals/files/presign` → recebe URL temporária R2; (2) n8n faz PUT direto no R2; (3) n8n cria aprovação com `r2Key`.
- R2 key construída pelo Pruma: `{orgId}/{uuid}/{filename}` — n8n nunca controla o path.
- Presigned URL: expiração 10min, Content-Type restrito, Content-Length-Range ≤ 10MB.
- Rate limit por org em `proxy.ts` no endpoint de presign.
- Upload pendente registrado em `approval_file_uploads` com status `"pending"` → vira `"confirmed"` ao criar aprovação. Cron diário apaga pendentes expirados.
- Lifecycle rule R2: arquivos deletados automaticamente após 30 dias.
- Aprovador acessa arquivo via signed URL com expiração curta (1h) — nunca URL pública permanente.

**Callback n8n enriquecido:**
```json
{ "approvalId", "status", "resolvedBy", "comment", "decisionValues", "resolvedAt", "files": [{ "r2Key", "filename", "mimeType", "sizeBytes" }] }
```
`files[]` incluído em approve, reject e retry — n8n pode baixar via R2 signed URL, mover no Drive, etc. após decisão.

**Storage local dev:** MinIO via Docker (S3-compatible, mesmo SDK do R2). Vars: `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`. Em prod apontam para R2 real.

**Setup R2 produção (já feito, documentado para referência):**
- Bucket: `pruma-prod` na conta Cloudflare `df058a3fa8a2d159a2422196f9cc7666`
- CORS configurado via `wrangler r2 bucket cors set pruma-prod` — permite `GET *` para presigned read URLs
- Env vars setadas no Vercel production: `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`
- `R2_ENDPOINT` prod = `https://df058a3fa8a2d159a2422196f9cc7666.r2.cloudflarestorage.com`
- Token R2: "Object Read & Write" em **Manage R2 API Tokens** no dashboard Cloudflare — guardar em 1Password
- MinIO local: `R2_ENDPOINT=http://localhost:9000` em `.env.local`. Usar URL pública (ngrok/cloudflare tunnel) só quando n8n for externo e precisar fazer upload diretamente no MinIO.

**Checklist antes de shipar feature que usa novo serviço externo:**
1. Bucket/recurso criado em prod
2. CORS configurado (se browser faz fetch direto)
3. Credenciais geradas com escopo mínimo
4. Env vars setadas no Vercel production (`vercel env ls production`)
5. Infra readiness verificada no `/review-cycle`

## Dívida técnica

### rate limiter in-memory — não escala em multi-instância
- `proxy.ts` usa `Map` em memória: cada instância Vercel tem seu próprio contador.
- Ataque de força bruta distribuído entre instâncias não é bloqueado corretamente.
- Solução futura: migrar para `@upstash/ratelimit` + Upstash Redis (drop-in, edge-compatible).

### retry-failed-callbacks — cron removido (Vercel free tier)
- Rota `/api/maintenance/retry-failed-callbacks` existe mas **não tem trigger automático**.
- Vercel free só suporta cron com recorrência diária (`0 X * * *`). Retry a cada 15min é incompatível — causava erro no deploy.
- Callbacks com falha ficam sem reprocessamento automático até resolver.
- Solução futura: GitHub Actions scheduled (`*/15 * * * *` não tem restrição), Inngest, ou upstash/qstash.

## Billing (Asaas)

- Gateway brasileiro, suporte a PIX e boleto. Sandbox: `sandbox.asaas.com/api/v3`.
- Novos clientes iniciam com `subscriptionStatus = "trial"`.
- IDs Asaas em `organizations` (`asaasCustomerId`, `asaasSubscriptionId`, `asaasPlanId`).
- Webhook Asaas atualiza `subscriptionStatus` automaticamente.

## Convenções de UI

- Server Components por padrão; `"use client"` só para eventos, estado ou browser APIs.
- Datas: `toLocaleString("pt-BR")` em todo sistema.
- Todo texto de UI em português brasileiro.