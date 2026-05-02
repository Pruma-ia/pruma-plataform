# Pruma IA

## What This Is

SaaS multi-tenant que conecta fluxos n8n a um painel de aprovações humanas. Clientes configuram workflows no n8n; quando um fluxo precisa de decisão humana, cria uma aprovação no Pruma. Aprovadores recebem notificação, decidem no painel, e o n8n continua automaticamente.

## Core Value

Aprovações chegam ao aprovador certo na hora certa — sem notificação, o produto não funciona standalone e o cliente não percebe valor.

## Requirements

### Validated

- ✓ Auth credentials (email/senha, recuperação, troca de senha) — existing
- ✓ Auth Google OAuth — existing
- ✓ Multi-tenant (orgs, members, roles, isolamento por organizationId) — existing
- ✓ n8n webhook integration (flows, flow runs, upsert via webhook) — existing
- ✓ Aprovações ricas (decision fields, decision values, approve/reject, callback n8n) — existing
- ✓ Anexos em aprovações (R2 presigned URL, approval_files, upload pendente) — existing
- ✓ Email notification para aprovação pendente (fire-and-forget) — existing
- ✓ LGPD compliance (termos de uso, política de privacidade, DPA B2B) — existing
- ✓ Asaas billing (PIX/boleto, webhook subscriptionStatus, trial flow) — existing
- ✓ Subscription guard no proxy.ts (bloqueia canceled/inactive) — existing
- ✓ Superadmin panel read-only (/admin) — existing
- ✓ Custom domain migrado — existing
- ✓ pruma-deploy-kit (git submodule para repos dos clientes) — existing
- ✓ Design system (tokens, componentes, Playwright visual tests) — existing
- ✓ Cron diário (cleanup orphan uploads + flow runs) — existing

### Active

- [ ] OTP verificação email (cadastro) e telefone (settings)
- [ ] Dashboard com métricas reais (aprovações pendentes, resolvidas hoje, fluxos ativos, tempo médio)
- [ ] Configurações da org (nome, logo, dados cadastrais)
- [ ] Onboarding org — coleta CNPJ/endereço/telefone e pré-preenche Asaas
- [ ] Gestão de aprovações — filtros por status/fluxo/período, busca, export CSV
- [ ] Onboarding checklist — primeiros passos para orgs novas no dashboard
- [ ] Perfil do usuário (nome, telefone, contas conectadas)
- [ ] Audit log de aprovações (decisor, timestamp, comentário, decision values)
- [ ] Self-service billing (troca de plano, cancelamento sem suporte)
- [ ] Histórico de cobranças (faturas e pagamentos via Asaas GET /payments)
- [ ] SLA/deadline em aprovações (expiresAt, auto-rejeição, lembrete 1h antes)
- [ ] Notificações in-app (bell icon, contador, dropdown recentes)
- [ ] WhatsApp notification + aprovação via link JWT assinado
- [ ] Refactor flow runs (performance e manutenibilidade)
- [ ] 2FA TOTP (Google Authenticator, configurável por org)

### Out of Scope

- Stripe / gateways internacionais — mercado BR, Asaas cobre PIX/boleto
- Mobile app nativo — web-first
- Chat em tempo real entre aprovadores — fora do modelo de produto
- n8n self-hosted gerenciado pelo Pruma — cliente gerencia próprio n8n
- Editor visual de workflows — Pruma é painel de aprovação, não builder de fluxos
- Notificação por SMS direto (sem WhatsApp) — WhatsApp cobre o caso de uso com mais contexto

## Context

- Produto sem clientes pagantes ainda — primeiro cliente pagante é o marco que guia prioridade
- Solo developer + Claude Code
- Stack: Next.js 16 (proxy.ts, não middleware.ts), NextAuth v5, Drizzle ORM, PostgreSQL Neon, Tailwind v4, shadcn/ui, Asaas, Cloudflare R2, Resend/Mailpit
- Maior bloqueio identificado: notificações — sem WhatsApp/in-app, aprovações passam em branco e cliente não percebe valor do produto
- Dívida técnica conhecida: rate limiter in-memory (não escala multi-instância), retry-failed-callbacks sem cron automático (Vercel free tier)
- OTP de email (p0) é prerequisito para WhatsApp (precisa de número verificado)

## Constraints

- **Solo:** Um dev — fases devem ser independentes e coesas, não depender de paralelismo real
- **Vercel free tier:** Cron apenas diário (`0 X * * *`) — retry a cada 15min inviável
- **Next.js 16:** proxy.ts (não middleware.ts), Neon placeholder obrigatório no build
- **Zod v4:** `z.record()` exige 2 args
- **Asaas:** Sandbox em `sandbox.asaas.com/api/v3` — não tem ambiente de staging separado
- **LGPD (dívida):** CNPJ, endereço, DPO, mailbox e remoção do aviso de rascunho ainda pendentes (ver memory)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Asaas (não Stripe) | Mercado BR, PIX/boleto nativos, clientes B2B brasileiros | ✓ Good |
| n8nSlug imutável vs slug (pode mudar) | Rebranding não quebra integração n8n | ✓ Good |
| R2 presigned URL para anexos | Vercel free limita body a 4.5MB; arquivos autenticados inacessíveis via URL | ✓ Good |
| callbackUrl SSRF + domain pinning | n8n é autenticado mas não confiável para HTML/URLs | ✓ Good |
| Fire-and-forget email notifications | Falha de email não cancela aprovação criada | ✓ Good |
| JWT carrega orgId + role + subscriptionStatus | Evita lookup extra a cada request | ✓ Good |
| pruma-deploy-kit como git submodule | Melhorias propagam para todos repos de clientes via update | — Pending |
| Rate limiter in-memory | Simples para MVP, não escala multi-instância | ⚠️ Revisit |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-02 after initialization*
