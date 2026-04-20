# Pruma IA — Regras de Negócio e Contexto do Projeto

## Instrução para Claude: Auto-documentação obrigatória

**SEMPRE QUE** uma nova regra de negócio for definida, confirmada ou descoberta durante o desenvolvimento:
1. Adicionar imediatamente na seção correspondente deste arquivo.
2. Se não existir seção adequada, criar uma nova.
3. Incluir o **rationale** (por quê existe essa regra), não só o que ela faz.
4. Atualizar `memory/project_pruma.md` se for informação estrutural relevante para futuras sessões.

Isso é implícito em toda conversa — não espere o usuário pedir.

---

## Visão Geral

A **Pruma IA** é uma plataforma SaaS multi-tenant que conecta fluxos de automação (n8n) a um painel de aprovações humanas. Empresas clientes usam a plataforma para gerenciar fluxos de automação que requerem validação humana em determinadas etapas.

---

## Modelo de Acesso

### Usuários Regulares (clientes)
- Cada usuário pertence a **uma organização** (tenant).
- A organização ativa é carregada no JWT via `organizationMembers JOIN organizations` na primeira membership encontrada.
- Papéis disponíveis: `owner | admin | member | viewer`.
- Todo dado (flows, approvals, billing) é isolado por `organizationId`.

### Superadmin (acesso Pruma IA)
- Campo `isSuperAdmin: boolean` na tabela `users`.
- Superadmin **não possui** `organizationId` na sessão — acessa todas as orgs pela URL `/admin/orgs/[orgId]`.
- O painel `/admin` é **somente leitura** — superadmin não pode alterar dados de clientes.
- Se uma alteração for necessária em dados de cliente, ela deve ser feita via script com log manual, nunca pelo painel admin.
- Conta master: `mattioli.marcelo@gmail.com`

### Rationale do padrão somente leitura
- Evitar alterações acidentais em múltiplas orgs.
- Não há log de auditoria atribuído a um usuário específico do cliente — qualquer alteração feita pelo superadmin não poderia ser rastreada corretamente nos dados do cliente.
- Regra: se o cliente precisar de uma alteração, o suporte orienta o próprio cliente a fazer, ou usa script de manutenção com documentação explícita.

---

## Arquitetura Multi-Tenant

- **Isolamento**: todos os recursos (flows, approvals, flowRuns) têm coluna `organizationId` com FK para `organizations`.
- **Onboarding**: ao criar conta, o usuário deve ser associado a uma organização via `organizationMembers`.
- **Convites**: tabela `organizationInvites` com token único e expiração.

---

## Fluxos (integração n8n)

- Os fluxos são **criados/atualizados pelo n8n** via webhooks — não pelo usuário diretamente.
- Cada fluxo tem um `externalId` (ID do fluxo no n8n) único por organização.
- Status possíveis: `running | success | error | waiting`.
- `flowRuns` registram cada execução com payload completo do n8n.

---

## Aprovações

- Aprovações são **criadas pelo n8n** quando um fluxo requer validação humana.
- Campos importantes:
  - `n8nExecutionId`: ID da execução no n8n para callback.
  - `callbackUrl`: URL que o sistema chama após aprovação/rejeição para continuar o fluxo.
  - `context`: dados arbitrários do n8n para exibir ao aprovador.
  - `assignedTo`: usuário específico designado para aprovar (opcional).
- Rejeição **exige comentário** obrigatório.
- Após resolução, o sistema faz callback para o n8n com a decisão.

---

## Billing (Asaas)

- Pagamentos processados via **Asaas** (gateway brasileiro, suporte a PIX e boleto).
- Planos disponíveis: `starter (R$97) | pro (R$297) | enterprise (R$997)` — todos mensais.
- Status de assinatura: `active | trial | past_due | canceled | inactive`.
- Novos clientes iniciam em `trial`.
- IDs Asaas armazenados em `organizations`: `asaasCustomerId`, `asaasSubscriptionId`, `asaasPlanId`.

---

## Identidade Visual

- **Cores primárias**: Azul Marinho `#0D1B4B`, Azul Médio `#162460`, Azul Profundo `#1E3080`.
- **Cores de destaque**: Ciano Elétrico `#00AEEF`, Ciano Claro `#5CCFF5`, Ciano Pálido `#E0F6FE`.
- **Semântica de cor**: erros sempre em vermelho (nunca substituir por brand color).
- **Tipografia**: Barlow (headings) + Inter (body) — substitutas de DIN Alternate e Calibri.
- CSS usa oklch com `@theme inline` (Tailwind v4).

---

## Stack Técnica

- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, Lucide icons.
- **Auth**: NextAuth v5 com JWT strategy + DrizzleAdapter.
- **DB**: PostgreSQL via Neon (produção) / Docker local (`pruma_db`), ORM Drizzle.
- **Monorepo**: `apps/web` (Next.js) + `claude-skills/`.
- **Variáveis de ambiente**: `.env.local` em `apps/web/`.

### Paths importantes
- Schema: `apps/web/db/schema.ts`
- Auth: `apps/web/src/lib/auth.ts`
- DB client: `apps/web/src/lib/db.ts`
- Dashboard pages: `apps/web/src/app/(dashboard)/`
- Admin pages: `apps/web/src/app/(admin)/`
- Types NextAuth: `apps/web/src/types/next-auth.d.ts`

---

## Convenções de Código

- Server Components por padrão; `"use client"` apenas quando necessário (eventos, estado, browser APIs).
- Queries sempre filtradas por `organizationId` — nunca retornar dados cross-tenant.
- Superadmin é a única exceção à regra acima, e apenas via rotas `/admin`.
- Datas exibidas em `pt-BR` (`toLocaleString("pt-BR")`).
- Texto da UI em português brasileiro.
