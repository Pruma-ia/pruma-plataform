# Requirements: Pruma IA — Milestone 2

**Defined:** 2026-05-02
**Core Value:** Aprovações chegam ao aprovador certo na hora certa — sem notificação, o produto não funciona standalone

---

## v1 Requirements

### Authentication & Verification

- [ ] **AUTH-01**: Usuário recebe código OTP por email ao criar conta e não consegue acessar o painel sem verificar
- [ ] **AUTH-02**: Usuário pode reenviar código OTP de verificação de email com cooldown de 60s
- [ ] **AUTH-03**: Usuário pode adicionar número de telefone nas configurações e verificá-lo via OTP por SMS/WhatsApp
- [ ] **AUTH-04**: Usuário com telefone verificado pode remover o número e a verificação é revogada

### Dashboard

- [ ] **DASH-01**: Usuário vê no dashboard: total de aprovações pendentes, resolvidas hoje, fluxos ativos, tempo médio de resolução
- [ ] **DASH-02**: Métricas do dashboard filtram por escopo da organização do usuário (isolamento multi-tenant)
- [ ] **DASH-03**: Org nova vê checklist de primeiros passos no dashboard (conectar n8n, criar primeiro fluxo, fazer primeira aprovação)
- [ ] **DASH-04**: Item do checklist é marcado automaticamente quando a ação correspondente é completada
- [ ] **DASH-05**: Checklist desaparece quando todos os itens estão completos

### Approval Management

- [ ] **APPROV-01**: Usuário pode filtrar aprovações por status (pendente, aprovada, rejeitada, expirada)
- [ ] **APPROV-02**: Usuário pode filtrar aprovações por fluxo e por período (data início / data fim)
- [ ] **APPROV-03**: Usuário pode buscar aprovações por texto livre (título, descrição, nome do fluxo)
- [ ] **APPROV-04**: Usuário pode exportar aprovações filtradas como CSV para auditoria
- [ ] **APPROV-05**: Usuário pode ver histórico de decisão de cada aprovação: quem decidiu, quando, comentário e decision values
- [ ] **APPROV-06**: Aprovação pode ter prazo de expiração (`expires_at`) definido pelo n8n ao criar
- [ ] **APPROV-07**: Aprovação expirada é automaticamente rejeitada pelo sistema com status `expired`
- [ ] **APPROV-08**: Aprovador recebe email de lembrete 1h antes do prazo de expiração (enviado uma única vez)

### Notifications

- [ ] **NOTIF-01**: Usuário vê bell icon no header com contador de notificações não lidas
- [ ] **NOTIF-02**: Usuário abre dropdown com lista de notificações recentes (máximo 20)
- [ ] **NOTIF-03**: Notificação é criada quando nova aprovação pendente chega para a org do usuário
- [ ] **NOTIF-04**: Notificação é criada quando aprovação é resolvida (para quem criou / contexto da org)
- [ ] **NOTIF-05**: Usuário pode marcar todas as notificações como lidas
- [ ] **NOTIF-06**: Contador atualiza a cada 30s sem recarregar a página

### Org & Profile

- [ ] **ORG-01**: Owner da org pode editar nome e logo da organização
- [ ] **ORG-02**: Owner da org pode editar dados cadastrais: CNPJ, endereço, telefone
- [ ] **ORG-03**: Dados cadastrais da org são coletados no onboarding ao criar a organização
- [ ] **ORG-04**: Dados cadastrais coletados no onboarding pré-preenchem automaticamente os campos de billing no Asaas
- [x] **PROF-01**: Usuário pode editar seu nome de exibição
- [x] **PROF-02**: Usuário pode ver e gerenciar contas conectadas (Google, credentials)
- [ ] **PROF-03**: Usuário vê o número de telefone verificado na página de perfil com opção de alterar

### Billing

- [ ] **BILL-01**: Usuário pode trocar de plano sem acionar suporte
- [ ] **BILL-02**: Usuário pode cancelar assinatura sem acionar suporte (com confirmação + survey de motivo)
- [ ] **BILL-03**: Usuário vê lista de faturas e pagamentos passados (via Asaas GET /payments)
- [ ] **BILL-04**: Webhook Asaas tem idempotência (reprocessar o mesmo evento não duplica atualização)
- [ ] **BILL-05**: `PAYMENT_DELETED` no webhook Asaas não é mapeado incorretamente para `canceled` (fix de bug ativo)

### WhatsApp

- [ ] **WA-01**: Org com telefone verificado recebe notificação WhatsApp quando nova aprovação pendente chega
- [ ] **WA-02**: Mensagem WhatsApp contém link único assinado para aprovar com um clique
- [ ] **WA-03**: Mensagem WhatsApp contém link único assinado para rejeitar com um clique
- [ ] **WA-04**: Link de aprovação/rejeição expira após 72h
- [ ] **WA-05**: Link de aprovação/rejeição é invalidado se a aprovação já foi resolvida (idempotência)
- [ ] **WA-06**: Link de aprovação/rejeição valida que o `organizationId` do token bate com o da aprovação (isolamento multi-tenant)
- [ ] **WA-07**: Usuário pode configurar por-org se quer notificação WhatsApp ativa ou desativada

### Infrastructure & Tech Debt

- [ ] **INFRA-01**: Rate limiting em endpoints OTP e 2FA migra de in-memory para Upstash Redis
- [ ] **INFRA-02**: GitHub Actions scheduled workflow (`*/15 * * * *`) como cron externo para SLA auto-expiry e retry-failed-callbacks
- [ ] **INFRA-03**: Refactor do módulo de flow runs para melhorar performance e manutenibilidade

---

## v2 Requirements (deferred)

### Security & Enterprise

- **SEC-01**: 2FA TOTP via Google Authenticator, configurável por org
- **SEC-02**: Backup codes para recovery de 2FA (8 códigos one-time)
- **SEC-03**: Enforcement de 2FA por org com grace period de 7 dias

### Notifications

- **NOTIF-07**: Usuário pode configurar preferências de notificação por canal (email, WhatsApp, in-app)

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Stripe / gateways internacionais | Mercado BR — Asaas cobre PIX/boleto, sem necessidade de Stripe |
| SMS 2FA | WhatsApp cobre o caso; SMS é custo extra sem vantagem |
| WhatsApp unofficial APIs (Z-API, Evolution) | Risco existencial de ban — Meta Cloud API apenas |
| Mobile app nativo | Web-first; PWA suficiente para v1 |
| Editor de workflows n8n | Pruma é painel de aprovação, não builder de fluxos |
| Chat em tempo real entre aprovadores | Fora do modelo de produto |
| SSE para notificações | Incompatível com Vercel Hobby (timeout 10s) |
| SMS OTP para autenticação | Scope: phone OTP para verificação de número, não para login |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 4 | Pending |
| AUTH-04 | Phase 4 | Pending |
| DASH-01 | Phase 1 | Pending |
| DASH-02 | Phase 1 | Pending |
| DASH-03 | Phase 1 | Pending |
| DASH-04 | Phase 1 | Pending |
| DASH-05 | Phase 1 | Pending |
| APPROV-01 | Phase 2 | Pending |
| APPROV-02 | Phase 2 | Pending |
| APPROV-03 | Phase 2 | Pending |
| APPROV-04 | Phase 2 | Pending |
| APPROV-05 | Phase 2 | Pending |
| APPROV-06 | Phase 6 | Pending |
| APPROV-07 | Phase 6 | Pending |
| APPROV-08 | Phase 6 | Pending |
| NOTIF-01 | Phase 4 | Pending |
| NOTIF-02 | Phase 4 | Pending |
| NOTIF-03 | Phase 4 | Pending |
| NOTIF-04 | Phase 4 | Pending |
| NOTIF-05 | Phase 4 | Pending |
| NOTIF-06 | Phase 4 | Pending |
| ORG-01 | Phase 1 | Pending |
| ORG-02 | Phase 2 | Pending |
| ORG-03 | Phase 2 | Pending |
| ORG-04 | Phase 2 | Pending |
| PROF-01 | Phase 1 | Complete |
| PROF-02 | Phase 1 | Complete |
| PROF-03 | Phase 4 | Pending |
| BILL-01 | Phase 3 | Pending |
| BILL-02 | Phase 3 | Pending |
| BILL-03 | Phase 3 | Pending |
| BILL-04 | Phase 3 | Pending |
| BILL-05 | Phase 3 | Pending |
| WA-01 | Phase 5 | Pending |
| WA-02 | Phase 5 | Pending |
| WA-03 | Phase 5 | Pending |
| WA-04 | Phase 5 | Pending |
| WA-05 | Phase 5 | Pending |
| WA-06 | Phase 5 | Pending |
| WA-07 | Phase 5 | Pending |
| INFRA-01 | Phase 1 | Pending |
| INFRA-02 | Phase 6 | Pending |
| INFRA-03 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 43 total
- Mapped to phases: 43
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-02*
*Last updated: 2026-05-02 after initial definition*
