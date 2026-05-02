# Feature Landscape

**Domain:** B2B SaaS approval workflow — Brazilian market
**Researched:** 2026-05-02
**Context:** Brownfield. Core approval CRUD, email notifications, Asaas billing, and multi-tenant already ship. This document covers the 10 remaining features in the Active backlog.

---

## Table Stakes

Features users expect. Missing = product feels incomplete or broken for B2B buyers.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| In-app notification bell | Every SaaS product has this; users working in-browser cannot rely on email-only | Medium | Polling v1 (30s interval) is acceptable; WebSockets not required at current scale |
| Dashboard with real metrics | An empty dashboard reads as a product that "does nothing"; KPIs are the landing page after login | Medium | 4 cards + pending list is sufficient; charts are not table stakes |
| Approval filters + search | Without filters, a growing approval list is unusable; buyers will churn when they cannot find specific records | Medium | Status / flow / date + CSV export; saved filters are not table stakes |
| Audit trail for decisions | B2B clients with regulated or financial processes require "who decided what, when, why" — without it, they cannot use the product for compliance | Medium | Most data already in DB (`resolvedBy`, `resolvedAt`, `comment`, `decisionValues`); UI is the missing piece |
| Self-service billing | No cancel/upgrade path forces users to contact support; in Brazil this results in chargebacks rather than cancellations, which damages reputation | Medium | Plan change + cancellation modal with explicit consequences; proration can be deferred |
| Email OTP verification at signup | Unverified emails cause notification delivery failures and are a prerequisite for WhatsApp; a SaaS that cannot confirm your email is not production-ready | Medium | Non-blocking for access (persistent banner) is the right call; hard-blocking at signup increases abandonment |
| Onboarding checklist | Solo developer market (n8n users) needs clear "what to do first"; without a guide, first-session abandonment is high | Small | 5 steps, server-verified, auto-dismisses at completion |
| SLA / deadline on approvals | Workflow automation (n8n) requires bounded time contracts; unbounded pending approvals break automated pipelines | Medium | expiresAt from n8n payload + auto-reject cron + 1h reminder email; escalation is deferred |

---

## Differentiators

Features that set Pruma apart. Not expected at signup, but create competitive stickiness once used.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| WhatsApp notification + one-click approval link | Brazil is a WhatsApp-first market (98% open rate vs ~20% email). Approval in <2 min vs hours. Direct reduction of resolution time = measurable value for the first client demo | Large | Signed JWT link, TTL 2h, single-use. Reply-based approval ("APROVAR 1234") is a v2 differentiator after validating link-click adoption |
| Phone OTP verification (prerequisite for WhatsApp) | Enables the WhatsApp channel. Also satisfies LGPD opt-in evidence requirement for personal data (phone number) used for notifications | Medium | Twilio/Sinch for SMS; adds a hard dependency cost (per-SMS) — evaluate Sinch vs Twilio BR pricing before dev |
| 2FA TOTP | Enterprise and regulated-sector buyers list MFA as a procurement checkbox. Org-level enforcement ("require 2FA for all members") is the differentiator beyond individual opt-in | Large | Uses `otplib` + `qrcode`; 8 backup codes mandatory; Google OAuth users are excluded (Google handles their own MFA) |
| Billing history (invoice list) | Reduces support tickets; finance teams in B2B accounts require invoice download for accounting. Asaas already exposes `GET /payments` | Small | Low complexity, high trust signal for enterprise buyers |

---

## Anti-Features

Things to deliberately NOT build in this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| WhatsApp reply-based approval ("APROVAR 12345") | High Meta template complexity, webhook parsing surface area, ambiguous UX, security risks (reply spoofing). Adds 3+ weeks of scope with unclear adoption | Ship link-based v1. Measure click rate. If >70%, reply-based is less necessary than assumed |
| Evolution API / Z-API for WhatsApp | Terms of service violation; account ban risk is existential for a product whose core value is notification delivery; frequent instability in 2025 (ghost messages, QR loop, Docker churn) | Meta Cloud API only. Non-negotiable for production |
| WebSocket real-time notifications (v1) | Adds infrastructure complexity (stateful connections, connection management) with no user-visible difference at <100 concurrent users; polling every 30s is imperceptible at this scale | 30s client-side polling. Revisit when DB polling becomes a bottleneck (measurable threshold: >500 concurrent users) |
| Prorated billing on plan change | Asaas does not support proration natively; implementing it requires manual credit calculation and customer communication. Wrong proration = support escalations | Cancel/upgrade at end of current period. Make the next-billing-date prominent in the UI so users understand the timing |
| SMS 2FA | TOTP is more secure (not interceptable via SIM swap), has zero per-message cost, and is already the recommended standard for authenticator apps. Adding SMS 2FA is scope expansion with regression risk | TOTP only. SMS OTP is already used for phone verification — two different OTP systems for auth adds confusion |
| Approval escalation (auto-reassign on expiry) | Complex routing logic, requires org-level approver hierarchy configuration. Out of scope until SLA is adopted and escalation demand is measured | Auto-reject on expiry with notification. Let n8n handle re-routing via callback |
| Filter "saved views" | Nice-to-have; requires per-user preference storage and UI for managing views. Not needed until customers report repeatedly configuring the same filters | URL-based filter state (query params) is already shareable/bookmarkable |
| Charts / historical graphs on dashboard | Attractive but not the first thing a new customer needs. Empty charts mislead users about data volume. Action-oriented cards deliver more value per pixel | 4 KPI cards + pending list. Introduce trend charts only after a cohort of active orgs exists to make them non-empty |
| Push notifications (mobile) | No mobile app; web push requires service worker setup, browser permission UX, and a push gateway. Low ROI against WhatsApp which already covers mobile reach | WhatsApp covers the mobile notification use case entirely |

---

## Feature Dependencies

```
verificacao-email (OTP email) ──────────────────────────────────────► onboarding-checklist (step 1 verified)
verificacao-telefone (OTP phone) ───────────────────────────────────► whatsapp-notificacao (requires phoneVerified=true)
                                                                       └── LGPD compliance URL (Meta requires it)
LGPD compliance (policy published) ────────────────────────────────► whatsapp-notificacao (Meta BSP requirement)

dashboard-metricas ─────────────────────────────────────────────────► onboarding-checklist (rendered inside dashboard)

gestao-aprovacoes-filtros ──────────────────────────────────────────► audit-log (shared page/filters)
gestao-aprovacoes-filtros ──────────────────────────────────────────► sla-deadline (badge UI, expired status in list)

sla-deadline ───────────────────────────────────────────────────────► notificacao-inapp (approval_expired event)

notificacao-inapp ──────────────────────────────────────────────────► whatsapp-notificacao (notification channel parallel to in-app)

self-service-billing ───────────────────────────────────────────────► billing-history (same /billing page, additive)

2fa-totp ───────────────────────────────────────────────────────────► gestao-senha (only for credentials users, 2FA excludes Google OAuth)
```

**Hard blockers (cannot ship without):**
- `verificacao-email` must ship before `whatsapp-notificacao` (phoneVerified field + LGPD evidence chain)
- LGPD compliance pages must be live before Meta Business API approval (Meta requires policy URL during BSP registration)
- Meta Cloud API account approved before `whatsapp-notificacao` dev is mergeable to prod (external process, 1-4 weeks)

---

## UX Patterns — BR B2B Market Specifics

### WhatsApp Approval Flow (HIGH confidence)

The correct v1 architecture is already documented in the PRD. Key UX notes from research:

**Message template structure (Meta approved):**
```
📋 Nova aprovação: {approval_title}
Fluxo: {flow_name}
Organização: {org_name}
Revisar e decidir: https://app.pruma.ia/approvals/{id}?t={jwt}

⚠️ A Pruma nunca solicita senhas ou dados sensíveis por WhatsApp.
```

- The CTA button must use a `{{1}}` dynamic URL variable in the template (Meta Cloud API supports this natively — the base URL is static, the suffix is parameterized per-send)
- Template category: **Utility** (not Marketing) — required to avoid 24h conversation window restrictions
- Template approval takes 15 min (automated) to 72h (manual review). Submit early; build the feature in parallel
- One-click link opens the approval page in browser, already authenticated via JWT. The user then approves or rejects with the existing UI — no extra approval-in-WhatsApp interaction is needed
- Rate limit: max 1 WhatsApp per approval. Do not resend automatically on delivery failure (spam risk → number ban)
- Opt-in must be explicit and recorded: "Desejo receber notificações de aprovação pelo WhatsApp" checkbox in `/settings/profile`, with the phone number shown. This is both a LGPD requirement and a Meta policy requirement

**Why link-based beats reply-based for v1:**
- No additional Meta template needed for the action itself
- Full auditability (decision goes through the web UI, same code path as email link)
- No ambiguity about which approval the reply targets in concurrent approvals
- No webhook parsing for reply messages (avoids injecting n8n-like message routing into the auth layer)

### In-App Notifications (HIGH confidence)

Standard bell icon pattern. Research confirms 30s polling is acceptable at this scale:

- Badge cap: display "99+" when count exceeds 99
- Unread items: distinct visual (blue dot / darker background) vs read
- Dropdown: last 10 notifications, each with timestamp, title, and direct link
- "Mark all as read" bulk action (single PATCH endpoint)
- Auto-mark as read on click (individual item)
- Notification types for v1: `approval_pending`, `approval_resolved` (another member decided), `approval_expired`
- Do NOT auto-dismiss the bell indicator when user opens the dropdown — only mark-as-read resets the counter

### OTP Verification (HIGH confidence)

- 6 digits, numeric, expires in 15 minutes
- Store only SHA-256 hash — never plaintext OTP
- Rate limit: 3 verification attempts per OTP, 3 sends per hour per email/phone
- Auto-focus + auto-advance on mobile input (single input field, `inputmode="numeric"`)
- Show countdown timer; do not hide the resend button until countdown reaches zero
- Email OTP: non-blocking (persistent banner), not a login gate. Google OAuth users skip email OTP (mark `emailVerified` automatically)
- Phone OTP: blocking before WhatsApp can be enabled (user must complete it in `/settings/profile`)
- SMS provider for BR: evaluate Sinch vs Twilio for Brazil delivery rate and price before committing. Both support BR but Sinch has competitive per-SMS pricing in LATAM

### Audit Log (HIGH confidence)

What makes an audit log useful vs a compliance checkbox for B2B:

**Minimum viable audit event fields (per decision):**
- `who`: user name + email + avatar (join from users table — data already exists)
- `what`: decision (approved / rejected), resolution timestamp
- `decisionValues`: the structured fields the approver filled in (already in DB)
- `comment`: free-text justification (already in DB)
- `source`: always "web_ui" for v1; will differentiate when API decisions ship

**Display pattern:** Timeline inside `/approvals/[id]` detail page:
```
[Avatar] Maria Silva approved at 14:32 on 28 Apr
  Comment: "Documentação confere"
  Decision fields: {"valor": "R$ 15.000", "centro_custo": "Marketing"}
```

**Filtering + query:** The audit value comes from the filter page (`gestao-aprovacoes-filtros`): filtering by status + date range + flow and then reading the resolvedBy column. The filter PRD and audit log PRD share the same `/approvals` page — implement them together.

**Immutability:** Audit data is already immutable by design (decisions are append-only; no update endpoint for `resolvedBy`/`resolvedAt`). Do not add a delete endpoint for approval records.

**Export:** CSV export from the filter page covers the audit export use case. No separate audit export needed.

**LGPD note:** Audit logs contain personal data (who decided). Retention policy should align with org data retention settings. For v1, 24-month retention is safe and appropriate for Brazilian B2B regulated clients.

### SLA / Deadline (HIGH confidence)

- `expiresAt` is optional (not all flows have SLAs)
- UI badge urgency levels: >2h (neutral), 1-2h (amber), <1h (red), expired (strikethrough or muted)
- Auto-reject cron: GitHub Actions at `*/30 * * * *` to work around Vercel free tier daily-only limit (already documented in CLAUDE.md)
- 1h reminder email: sent by the same cron job that checks for soon-to-expire records
- Limit `expiresAt` to a minimum of `now + 5 minutes` at creation — reject payloads with past or near-present deadlines
- `expired` is a UI state; in the DB it maps to `status = 'rejected'` with `comment = 'Expirado automaticamente'` to preserve the existing binary status model

### Dashboard Metrics (HIGH confidence)

The action-oriented dashboard — primary goal is to answer "what do I need to do right now?":

- **KPI 1:** Pending approvals (integer, clickable → `/approvals?status=pending`)
- **KPI 2:** Resolved today (integer)
- **KPI 3:** Active flows (integer)
- **KPI 4:** Avg resolution time, last 30 days (formatted as "X horas" or "X min" — choose format that is non-zero for typical customers)
- Below KPIs: list of up to 5 oldest pending approvals with "Revisar" CTA
- Empty state: positive framing ("Nenhuma aprovação pendente — tudo em dia") not an error state
- Onboarding checklist renders conditionally (org age < 7 days OR zero approvals ever)

### Self-Service Billing (HIGH confidence)

BR B2B billing UX requirements:

- Show: current plan, price in BRL, next billing date (not just "Pro plan")
- Cancellation modal: display exact access-end date ("Seu acesso continua até DD/MM/AAAA"), require typing "CANCELAR" to confirm (standard anti-churn pattern)
- Offer downgrade as alternative before showing cancel CTA (reduces churn without blocking the path)
- Post-cancellation: show reactivation button prominently, do not hide it
- Billing history: list of invoices from Asaas `GET /payments`, each with date, amount, status (pago / pendente / vencido), PDF link if Asaas provides one

### 2FA TOTP (MEDIUM confidence)

- Setup flow in `/settings/profile` only (not forced at login for opt-in)
- Steps: (1) show QR code + manual entry key, (2) enter 6-digit code to verify, (3) download/print 8 backup codes
- For mobile users: show the TOTP secret as copyable text alongside the QR (QR is unscanneable if the setup is on the same device)
- Backup codes: show once, downloadable as `.txt`, stored as bcrypt hashes
- Org-level enforcement: owner toggle "Require 2FA for all members" with 7-day grace period (non-compliant members get a banner, not a lock)
- Disable 2FA: requires entering current valid TOTP (prevents disabling via account takeover)
- Google OAuth users: skip TOTP entirely (Google handles their authentication including their own 2FA)

---

## MVP Recommendation

Priority ordering for first-client-payable milestone:

1. **verificacao-email** (P0, RICE 320) — prerequisite for WhatsApp; fixes notification reliability
2. **dashboard-metricas** (P1, RICE 280) — first impression on login; empty dashboard is a churn risk
3. **gestao-aprovacoes-filtros** (P1, RICE 220) — table stakes for any growing approval volume; CSV export is the audit bridge before audit-log UI ships
4. **onboarding-checklist** (P1, RICE 200) — small effort, high activation impact
5. **audit-log** (P1, RICE 180) — completes the filter page; data already exists in DB
6. **self-service-billing** (P1, RICE 165) — required before first paying client; no manual cancel path = chargeback risk
7. **notificacao-inapp** (P2, RICE 120) — table stakes for in-browser users; prerequisite for SLA expired events
8. **sla-deadline** (P2, RICE 140) — unlocks n8n automation use cases with time contracts
9. **verificacao-telefone** (P2, blocked by #1) — must ship before WhatsApp
10. **whatsapp-notificacao** (P2, RICE 100) — core differentiator; ship when phone verification + LGPD + Meta account are all ready
11. **2fa-totp** (P3, RICE 80) — enterprise procurement checkbox; defer until first enterprise prospect signals it as a blocker

**Defer indefinitely:** billing-history invoice list (low effort but not blocking any sale), tour-guided onboarding (nice-to-have after checklist proves insufficient).

---

## Sources

- [WhatsApp Cloud API — Interactive CTA URL Messages](https://developers.facebook.com/docs/whatsapp/cloud-api/messages/interactive-cta-url-messages/) — MEDIUM confidence (page content not directly fetched, behavior inferred from BSP documentation)
- [Dynamic URLs in WhatsApp CTA Buttons — BotSailor](https://botsailor.com/blog/use-dynamic-url-in-calltoaction-button-in-a-message-template) — MEDIUM confidence (third-party BSP documentation confirming `{{1}}` suffix parameterization)
- [Audit Logs for SaaS Enterprise Customers — Frontegg](https://frontegg.com/blog/audit-logs-for-saas-enterprise-customers) — HIGH confidence
- [Audit Logs for SaaS — Yaro Labs](https://yaro-labs.com/blog/audit-logs-for-saas) — HIGH confidence
- [2FA UX Patterns — LogRocket](https://blog.logrocket.com/ux-design/2fa-user-flow-best-practices/) — HIGH confidence
- [OTP Expiration, Rate Limiting & UX Best Practices — Arkesel](https://arkesel.com/otp-expiration-rate-limiting-best-practices/) — HIGH confidence
- [Evolution API Problems 2025 — WASenderAPI](https://wasenderapi.com/blog/evolution-api-problems-2025-issues-errors-best-alternative-wasenderapi) — MEDIUM confidence (vendor-biased source, but risks corroborated by multiple community threads)
- [WhatsApp Automation Ban Risk — Kraya AI](https://blog.kraya-ai.com/whatsapp-automation-ban-risk) — MEDIUM confidence
- [SaaS Onboarding Checklist 2026 — Rock n Roll Dev](https://rocknroll.dev/p/saas-onboarding-checklist/) — HIGH confidence
- [Cancellation Flow Best Practices — Userpilot](https://userpilot.com/blog/cancellation-flow-examples/) — HIGH confidence
- Internal PRDs: `whatsapp-notificacao-aprovacao.md`, `sla-deadline-aprovacao.md`, `notificacao-inapp.md`, `audit-log-aprovacoes.md`, `verificacao-email-telefone.md`, `dashboard-metricas.md`, `self-service-billing.md`, `onboarding-checklist.md`, `2fa.md`, `gestao-aprovacoes-filtros.md` — HIGH confidence (primary source for scope and constraints)
