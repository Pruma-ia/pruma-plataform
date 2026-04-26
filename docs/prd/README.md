# Backlog de PRDs — Pruma IA

Documentos de requisitos ordenados por prioridade RICE.

| # | Feature | Status | RICE Score | Esforço | Prioridade |
|---|---------|--------|-----------|---------|------------|
| 1 | [Login com Google](login-google.md) | ✅ Entregue | 666 | S | — |
| 2 | [Avatar do Google](avatar-google.md) | ✅ Entregue | 250 | XS | — |
| 3 | [Email de Aprovação Pendente](email-aprovacao-pendente.md) | 📋 Pronto para dev | 550 | M | P0 |
| 4 | [Compliance LGPD: Termos, Privacidade e DPA](compliance-lgpd-termos.md) | 📋 Pronto para dev | 500 | M | P0 |
| 5 | [Gestão de Senha (Recuperação + Troca)](gestao-senha.md) | 📋 Pronto para dev | 450 | S | P0 |
| 6 | [Verificação de Email e Telefone](verificacao-email-telefone.md) | 📋 Pronto para dev | 320 | M | P0 |
| 7 | [Integração Asaas](integracao-asaas.md) | 📝 PRD pendente | 300 | L | P1 |
| 8 | [Dashboard com Métricas Reais](dashboard-metricas.md) | 📋 Pronto para dev | 280 | M | P1 |
| 9 | [Migração para Domínio Próprio](migracao-dominio-custom.md) | 📋 Pronto para dev | 240 | S | P1 |
| 10 | [Onboarding + Dados Cadastrais da Org](onboarding-org-dados-cadastrais.md) | 📋 Pronto para dev | 220 | L | P1 |
| 11 | [Configurações da Organização](configuracoes-org.md) | 📋 Pronto para dev | 250 | S | P1 |
| 12 | [Gestão de Aprovações: Filtros, Busca e Exportação](gestao-aprovacoes-filtros.md) | 📋 Pronto para dev | 220 | M | P1 |
| 13 | [Onboarding Checklist](onboarding-checklist.md) | 📋 Pronto para dev | 200 | S | P1 |
| 14 | [Perfil do Usuário](perfil-usuario.md) | 📋 Pronto para dev | 120 | M | P1 |
| 15 | [Audit Log de Aprovações](audit-log-aprovacoes.md) | 📋 Pronto para dev | 180 | M | P1 |
| 16 | [Self-Service Billing (Troca de Plano + Cancelamento)](self-service-billing.md) | 📋 Pronto para dev | 165 | M | P1 |
| 17 | [SLA / Deadline de Aprovação](sla-deadline-aprovacao.md) | 📋 Pronto para dev | 140 | M | P2 |
| 18 | [Notificação In-App (Bell Icon)](notificacao-inapp.md) | 📋 Pronto para dev | 120 | M | P2 |
| 19 | [WhatsApp: Notificação e Aprovação](whatsapp-notificacao-aprovacao.md) | 🔍 Em discovery | 100 | L | P2 |
| 20 | [Refactor Fluxos em Execução](refactor-flow-runs.md) | 📝 PRD pendente | 100 | L | P2 |
| 21 | [2FA (Autenticação de Dois Fatores)](2fa.md) | 📝 PRD pendente | 80 | L | P3 |
| — | 🐛 Fix: menu superadmin não aparece em prod | 🐛 Bug | — | XS | — |

## Status

- 📋 Pronto para dev — PRD aprovado, pode entrar no sprint
- 🚧 Em desenvolvimento
- ✅ Entregue
- 📝 PRD pendente — feature mapeada, documento não escrito ainda
- 🔍 Em discovery — requer validação externa antes de iniciar dev

## Roadmap por prioridade

### P0 — Antes de cobrar qualquer cliente
- Email de Aprovação Pendente
- Compliance LGPD (Termos + Privacidade + DPA)
- Gestão de Senha (Recuperação + Troca)
- Verificação de Email e Telefone

### P1 — Primeiro mês pago
- Integração Asaas completa
- Dashboard com Métricas Reais
- Migração para Domínio Próprio *(pré-requisito para publicar política de privacidade LGPD)*
- Onboarding + Dados Cadastrais da Org
- Configurações da Organização
- Filtros, Busca e Exportação de Aprovações
- Onboarding Checklist
- Perfil do Usuário
- Audit Log de Aprovações
- Self-Service Billing

### P2 — Retenção 90 dias
- SLA / Deadline de Aprovação
- Notificação In-App
- WhatsApp Notificação + Aprovação *(bloqueado por: verificação telefone + LGPD publicada + Meta API aprovada)*
- Refactor Flow Runs

### P3 — Maturidade enterprise
- 2FA

## Como adicionar nova feature

1. Criar arquivo `docs/prd/nome-da-feature.md` usando o template abaixo
2. Adicionar linha na tabela acima na posição correta por RICE score
3. Adicionar linha no `pruma_backlog.csv`

## Template One-Page PRD

```markdown
# PRD — [Nome da Feature]

**Status:** | **Prioridade:** | **Esforço estimado:**

## Problema
## Solução
## Escopo (dentro / fora)
## Fluxo do usuário
## Requisitos técnicos
## Métricas de sucesso
## Riscos
## Dependências
```
