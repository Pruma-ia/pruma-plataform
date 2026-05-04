# Roadmap: Pruma IA — Milestone 2

## Overview

O core de aprovações já existe. Este milestone entrega tudo que converte o primeiro cliente pagante: segurança no cadastro (OTP email), dashboard operacional, gestão completa de aprovações com auditoria, billing self-service sem suporte, notificações in-app e WhatsApp com one-click approve/reject, e resiliência de SLA. O caminho crítico é Phase 1 → 2 → 3 → 4 → 5; Phase 6 finaliza resiliência de infraestrutura.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - OTP email, dashboard com métricas reais, org settings, onboarding checklist, perfil do usuário, Upstash rate limiting
- [ ] **Phase 2: Gestao e Auditoria** - Filtros/busca/export de aprovações, audit log, dados cadastrais da org, refactor flow runs
- [ ] **Phase 3: Billing Self-Service** - Troca de plano, cancelamento, histórico de faturas, fix webhook Asaas
- [ ] **Phase 4: Notificacoes e Phone OTP** - Phone OTP, notificações in-app (bell + contador + dropdown), perfil com telefone
- [ ] **Phase 5: WhatsApp** - Notificação WhatsApp + links JWT assinados para approve/reject one-click
- [ ] **Phase 6: SLA e Resiliencia** - SLA/deadline com auto-rejeição, lembrete 1h, GitHub Actions cron 15min

## Phase Details

### Phase 1: Foundation
**Goal**: Produto seguro no cadastro e operacionalmente visível — org nova consegue começar a usar com métricas reais e perfil configurado
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, ORG-01, PROF-01, PROF-02, INFRA-01
**Success Criteria** (what must be TRUE):
  1. Usuário novo recebe código OTP por email e não consegue acessar o painel sem verificar o endereço
  2. Usuário pode reenviar OTP com cooldown de 60s visível na UI
  3. Dashboard exibe métricas reais da org: pendentes, resolvidas hoje, fluxos ativos, tempo médio de resolução
  4. Org nova vê checklist de primeiros passos que se marca automaticamente conforme ações são completadas e desaparece quando tudo está feito
  5. Owner da org pode editar nome e logo; usuário pode editar nome e ver contas conectadas
**Plans**: 6 plans

Plans:

**Wave 1**
- [x] 01-01-PLAN.md — schema + Upstash ratelimit module + JWT emailVerified claim

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 01-02-PLAN.md — OTP flow (lib/otp, verify-otp + resend-otp routes, /verify-email page)
- [x] 01-03-PLAN.md — dashboard metrics (4 cards + onboarding checklist)
- [x] 01-04-PLAN.md — org identity (name + logo edit, header logo display)

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 01-05-PLAN.md — user profile (display name + connected accounts) — depends_on: [01, 04]
- [x] 01-06-PLAN.md — proxy.ts emailVerified gate + Upstash migration — depends_on: [01, 02]

Cross-cutting constraints:
- All API routes must read `organizationId` from `session.user.organizationId` only (never request body)
- All DB queries must be scoped by `eq(<table>.organizationId, orgId)` — multi-tenant isolation
- `drizzle-kit push` is forbidden — use `drizzle-kit generate` + psql apply only
**UI hint**: yes

**External dependency (INICIAR IMEDIATAMENTE — paralelo ao desenvolvimento):**
> Registro Meta Business Manager + WABA (WhatsApp Business Account) tem lead time de 1-4 semanas. Iniciar o processo durante Phase 1 para que a aprovação Meta chegue antes de Phase 5 começar. Sem WABA aprovado, Phase 5 não pode ser executada.

---

### Phase 2: Gestao e Auditoria
**Goal**: Aprovações são gerenciáveis — time consegue filtrar, buscar, exportar e auditar decisões; org tem dados cadastrais completos (desbloqueia LGPD e registro Meta)
**Depends on**: Phase 1
**Requirements**: APPROV-01, APPROV-02, APPROV-03, APPROV-04, APPROV-05, ORG-02, ORG-03, ORG-04, INFRA-03
**Success Criteria** (what must be TRUE):
  1. Usuário pode filtrar aprovações por status, fluxo e período e exportar o resultado como CSV
  2. Usuário pode buscar aprovações por texto livre e ver os resultados instantaneamente
  3. Usuário consegue ver o histórico completo de decisão de cada aprovação: decisor, timestamp, comentário e decision values
  4. Owner da org pode editar e salvar CNPJ, endereço e telefone da organização no onboarding e nas configurações
  5. Dados cadastrais coletados no onboarding pré-preenchem automaticamente os campos de billing no Asaas
**Plans**: 4 plans

Plans:

**Wave 1**
- [ ] 02-01-PLAN.md — approval_events schema + migration + 3 API call-site instrumentation (APPROV-05)

**Wave 2** *(blocked on Wave 1 completion)*
- [ ] 02-02-PLAN.md — /approvals refactor: searchParams filters + debounced search + pagination + CSV export (APPROV-01/02/03/04)
- [ ] 02-03-PLAN.md — /approvals/[id] timeline + approval_viewed insert (APPROV-05) — depends_on: [01]
- [ ] 02-04-PLAN.md — JWT orgCnpjFilled + proxy CNPJ guard + /onboarding/cadastral + Asaas sync + /flows/[id] runs UX (ORG-02/03/04, INFRA-03)
**UI hint**: yes

---

### Phase 3: Billing Self-Service
**Goal**: Cliente consegue trocar de plano, cancelar assinatura e ver faturas sem abrir ticket de suporte — e o webhook Asaas processa eventos de forma confiável
**Depends on**: Phase 2
**Requirements**: BILL-01, BILL-02, BILL-03, BILL-04, BILL-05
**Success Criteria** (what must be TRUE):
  1. Usuário pode trocar de plano diretamente no painel sem precisar de suporte
  2. Usuário pode cancelar a assinatura com confirmação e survey de motivo, sem precisar de suporte
  3. Usuário vê lista de faturas e pagamentos passados carregada via Asaas GET /payments
  4. Reprocessar o mesmo evento webhook Asaas não duplica atualização de status (idempotência)
  5. Evento PAYMENT_DELETED no webhook não altera incorretamente o subscriptionStatus para canceled
**Plans**: TBD
**UI hint**: yes

---

### Phase 4: Notificacoes e Phone OTP
**Goal**: Aprovadores são notificados dentro do produto — bell icon mostra pendências em tempo real; usuário pode verificar e gerenciar número de telefone (prerequisito para WhatsApp)
**Depends on**: Phase 3
**Requirements**: AUTH-03, AUTH-04, NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04, NOTIF-05, NOTIF-06, PROF-03
**Success Criteria** (what must be TRUE):
  1. Usuário vê bell icon no header com contador de não lidas que atualiza a cada 30s sem recarregar a página
  2. Usuário abre dropdown com as 20 notificações mais recentes e pode marcar todas como lidas
  3. Notificação aparece automaticamente quando nova aprovação pendente chega para a org
  4. Usuário pode adicionar número de telefone nas configurações e verificá-lo via OTP; pode também remover o número verificado
  5. Usuário vê número de telefone verificado na página de perfil com opção de alterar
**Plans**: TBD
**UI hint**: yes

---

### Phase 5: WhatsApp
**Goal**: Aprovadores recebem notificação no WhatsApp com links para aprovar ou rejeitar com um clique — sem precisar acessar o painel
**Depends on**: Phase 4

**External dependency (prerequisito bloqueante):**
> Phase 5 só pode ser executada após: (1) Phase 4 completa, E (2) Meta WABA aprovado com template de mensagem aprovado pela Meta. O registro deve ter sido iniciado durante Phase 1. Sem WABA aprovado, esta fase não inicia.

**Requirements**: WA-01, WA-02, WA-03, WA-04, WA-05, WA-06, WA-07
**Success Criteria** (what must be TRUE):
  1. Org com telefone verificado recebe mensagem WhatsApp quando nova aprovação pendente chega
  2. Mensagem WhatsApp contém links únicos assinados para aprovar e rejeitar com um clique
  3. Links JWT expiram após 72h e são invalidados se a aprovação já foi resolvida
  4. Link de aprovação/rejeição valida que o organizationId do token bate com o da aprovação (sem cross-tenant)
  5. Owner da org pode ativar ou desativar notificações WhatsApp por organização
**Plans**: TBD

---

### Phase 6: SLA e Resiliencia
**Goal**: Aprovações com prazo são automaticamente encerradas no tempo certo — sistema é resiliente com cron externo de 15min e rate limiting escalável em Redis
**Depends on**: Phase 4
**Requirements**: APPROV-06, APPROV-07, APPROV-08, INFRA-02
**Success Criteria** (what must be TRUE):
  1. n8n pode definir prazo de expiração (expires_at) ao criar uma aprovação
  2. Aprovação com prazo vencido é automaticamente rejeitada com status expired pelo sistema
  3. Aprovador recebe email de lembrete 1h antes do prazo de expiração, enviado uma única vez
  4. GitHub Actions scheduled workflow (a cada 15min) executa SLA auto-expiry e retry-failed-callbacks de forma confiável
**Plans**: TBD

---

## Progress

**Execution Order:**
Phases execute em ordem numérica: 1 → 2 → 3 → 4 → 5 (requer WABA aprovado) / 6 (paralelo após 4)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 6/6 | Complete | 2026-05-02 |
| 2. Gestao e Auditoria | 0/TBD | Not started | - |
| 3. Billing Self-Service | 0/TBD | Not started | - |
| 4. Notificacoes e Phone OTP | 0/TBD | Not started | - |
| 5. WhatsApp | 0/TBD | Not started | - |
| 6. SLA e Resiliencia | 0/TBD | Not started | - |
