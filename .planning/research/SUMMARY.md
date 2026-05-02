# Research Summary: Pruma IA — Milestone 2

**Synthesized from:** STACK.md · FEATURES.md · ARCHITECTURE.md · PITFALLS.md
**Date:** 2026-05-02

---

## What's Being Built

Pruma IA já tem o core de aprovações funcionando. Este milestone completa o produto para o primeiro cliente pagante: notificações que realmente chegam (WhatsApp + in-app), gestão de aprovações com auditoria, billing self-service, e segurança adequada para B2B (OTP, 2FA).

**Meta principal:** primeiro cliente pagante. Tudo que não serve esse objetivo é diferido.

---

## Stack Additions

| Feature | Library / Approach | Rationale |
|---------|-------------------|-----------|
| WhatsApp | Twilio SDK `^6.0.0` (BSP Meta Cloud API) | Única opção segura — unofficial APIs = risco de ban existencial |
| In-app notifications | Polling 30s contra `notifications` table | SSE incompatível com Vercel Hobby (timeout 10s) |
| OTP email | `crypto.randomInt()` + bcrypt + Resend | Já disponível, sem nova dependência |
| Phone OTP | Twilio Verify (se já usando Twilio) | Elimina tabela `phone_otp_tokens` — Twilio gerencia lifecycle |
| 2FA TOTP | `otplib ^13.4.0` | TypeScript-first, RFC 6238, ativo (NÃO usar `speakeasy` — abandonado 2017) |
| Billing self-service | Asaas API existente | `PUT /subscriptions/{id}` — validar em sandbox antes de buildar UI |
| Rate limiting OTP/2FA | `@upstash/ratelimit` + Upstash Redis | In-memory Map não protege em multi-instância Vercel |
| SLA cron | GitHub Actions `*/15 * * * *` | Vercel Hobby só suporta cron diário |

---

## Feature Categories

### Table Stakes (sem isso, cliente não paga)
- Dashboard com métricas reais
- Gestão de aprovações: filtros + busca + export CSV
- Audit log (dados já existem no DB — só expor)
- Self-service billing (troca de plano + cancelamento)
- Email OTP no cadastro
- Onboarding checklist

### Diferenciadores (vantagem competitiva BR)
- **WhatsApp notification + link JWT assinado** — 98% open rate vs 20% email; one-click approve/reject
- Phone OTP (prerequisito para WhatsApp)
- In-app notifications com contador
- SLA/deadline com auto-rejeição

### Diferir (enterprise add-on, não bloqueia primeiro cliente)
- 2FA TOTP — prerequisito de procurement enterprise, não de SMB
- Histórico de cobranças detalhado — útil mas não urgente

### Anti-features (não construir)
- WhatsApp unofficial APIs (Evolution API, Z-API, WPP Connect) — risco de ban
- SMS 2FA — WhatsApp cobre o caso de uso; SMS é custo extra
- SSE para notificações em tempo real no Vercel — incompatível arquiteturalmente

---

## Recommended Phase Order

Ordem ditada por dependências técnicas e externas:

```
Phase 1: Foundation
  └─ OTP email verification (p0)
  └─ Dashboard métricas reais (p1)
  └─ Configurações da org (p1)
  └─ Onboarding checklist (p1)
  └─ Perfil do usuário (p1)
  └─ [PARALELO] Iniciar registro Meta Business + WABA (4 semanas externas)

Phase 2: Gestão & Auditoria
  └─ Gestão de aprovações: filtros + busca + export CSV (p1)
  └─ Audit log de aprovações (p1)
  └─ Onboarding org dados cadastrais: CNPJ/endereço (p1) [desbloqueia LGPD + Meta]

Phase 3: Billing Self-Service
  └─ Self-service billing: troca de plano + cancelamento (p1)
  └─ Histórico de cobranças (p2)
  └─ Retrofit webhook Asaas: idempotência + PAYMENT_DELETED fix [BUG ATIVO]

Phase 4: Notificações & Phone OTP
  └─ Phone OTP verification (p0 prerequisito WhatsApp)
  └─ In-app notifications: bell + contador + dropdown (p2)
  └─ Notification preferences: por canal por usuário

Phase 5: WhatsApp
  └─ WhatsApp notification + link JWT assinado (p2)
  └─ [Requer: Phase 4 + Meta WABA aprovado + template aprovado]

Phase 6: SLA & Resiliência
  └─ SLA/deadline: expiresAt + auto-rejeição + lembrete 1h (p2)
  └─ GitHub Actions cron (SLA + retry-failed-callbacks)
  └─ Upstash rate limiting (migra in-memory → Redis)

Phase 7: Segurança Enterprise
  └─ 2FA TOTP (p3)
  └─ Refactor flow runs (p2)
```

---

## Critical Pitfalls por Fase

### Phase 1 (Foundation)
- OTP tokens devem ser armazenados **hasheados** (não plaintext)
- Rate limit em `/api/auth/verify-otp` — in-memory ainda, mas necessário antes de ship

### Phase 2 (Gestão & Auditoria)
- Audit log: dados já existem; foco é queryabilidade, não captura extra
- LGPD debt (CNPJ, endereço, DPO, mailbox) **deve estar resolvido antes do registro Meta**

### Phase 3 (Billing)
- **BUG ATIVO:** `/api/webhooks/asaas` sem idempotência + `PAYMENT_DELETED` mapeado errado para `canceled`
- Validar `PUT /subscriptions/{id}` no sandbox Asaas antes de construir UI de troca de plano
- Fluxo cancel = UI otimista → webhook confirma; nunca atualizar `subscriptionStatus` direto da UI

### Phase 4 (Notificações)
- Polling 30s, não SSE (SSE incompatível com Vercel Hobby)
- Pausar polling em `visibilitychange` para evitar polling storm em abas inativas

### Phase 5 (WhatsApp)

**Links JWT assinados têm dois riscos de segurança críticos:**
1. Token sem `exp` claim permite aprovação após prazo indefinido
2. Sem verificação `token.organizationId === approval.organizationId`, link de uma org pode cruzar para outra

Implementação obrigatória:
- `exp` de 72h
- Check `approval.status === "pending"` antes de processar
- Check `orgId` do token vs `approval.organizationId`
- `jti` (JWT ID) único para prevenir replay

### Phase 6 (SLA)
- SLA enforcement no Vercel free = lazy expiry na leitura + GitHub Actions 15min
- `sla_warning_sent_at` column para idempotência do lembrete email
- `expires_at` sempre UTC; display com `toLocaleString("pt-BR")`

### Phase 7 (2FA)
- TOTP secret **deve ser criptografado AES-256-GCM** no DB — plaintext = 2FA inútil após qualquer leitura do DB
- NextAuth v5 não tem suporte nativo a 2FA — implementar via JWT claim `twoFactorVerified` + check no `proxy.ts`
- Backup codes obrigatórios (8 códigos one-time hasheados)

---

## Open Questions (resolver antes das fases indicadas)

| Questão | Resolver antes de | Urgência |
|---------|-------------------|---------|
| Registro Meta Business Manager iniciado? | Phase 5 (4 semanas lead time) | **IMEDIATO** |
| Asaas `PUT /subscriptions/{id}` suporta `value`? Testar no sandbox | Phase 3 | Alta |
| Twilio Verify para phone OTP (elimina tabela) vs custom tokens | Phase 4 | Média |
| SLA enforcement: daily Vercel cron aceitável, ou GitHub Actions desde o início? | Phase 6 | Média |
| LGPD debt resolvido (CNPJ, endereço, DPO, mailbox, aviso rascunho)? | Phase 2 (prerequisito Meta) | Alta |

---

## Resumo Executivo

**Caminho crítico para primeiro cliente pagante:**
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

**Maior risco externo:** Meta WABA approval (1-4 semanas). Iniciar registro hoje — em paralelo com qualquer desenvolvimento.

**Maior risco técnico:** Bug ativo no webhook Asaas (idempotência + PAYMENT_DELETED). Corrigir na Phase 3 antes de habilitar self-service billing.

**Maior risco de segurança:** Links JWT WhatsApp sem orgId cross-check e sem jti anti-replay. Endereçar na Phase 5.
