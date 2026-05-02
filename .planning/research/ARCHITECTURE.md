# Architecture Patterns

**Project:** Pruma IA — Milestone: Notifications, SLA, Audit, Billing Self-Service
**Researched:** 2026-05-02
**Confidence:** HIGH (schema from source, Vercel constraints verified, Asaas from official docs)

---

## Existing Architecture Baseline

Before the new features, the schema is:

```
users · accounts · sessions · verificationTokens
organizations (asaasCustomerId, subscriptionStatus)
organizationMembers · organizationInvites
flows · flowRuns
approvals (expiresAt already present, callbackStatus, decisionFields/Values)
approvalFiles · approvalFileUploads
passwordResetTokens · onboardingTokens
```

Key constraint: `approvals.expiresAt` **already exists** as a column — SLA deadline requires no new column there, only new logic to consume it.

---

## Vercel Free Tier Constraints (Architectural Forcing Function)

This shapes every delivery decision below.

| Constraint | Impact |
|---|---|
| Cron: `0 X * * *` only (daily) | No 15-min retry, no hourly SLA checks. One cron slot per task. |
| Serverless function timeout: 10s (Hobby) | SSE connections are killed at 10s. No persistent connections. |
| No in-memory state across requests | Rate limiter already leaks between instances. Pub/Sub impossible without external broker. |
| Body size limit: 4.5 MB | Already handled by R2 presign pattern. Irrelevant for new features. |
| 3 cron slots currently used (03:00, 04:00, 05:00 UTC) | SLA expiry + WhatsApp reminder must fit new slots. Prefer combining into existing slots or adding at most 2 new ones. |

**Real-time delivery verdict:** SSE is broken on Vercel Hobby (10s hard kill). WebSockets require persistent process. **Polling is the only viable in-app delivery mechanism without external dependencies.** A 30-second client poll against a lightweight `/api/notifications/unread-count` endpoint is the correct approach.

---

## Feature 1: WhatsApp Notifications + Signed JWT Link

### Architecture

WhatsApp notification is a **fire-and-forget side-effect** of `POST /api/n8n/approvals`, mirroring the existing email pattern. The signed link carries enough context for approve/reject without a browser login session.

### JWT Link Design

```
/api/approvals/[id]/resolve?token=<jwt>
```

JWT payload (signed with `APPROVAL_TOKEN_SECRET`, HS256, 72h expiry):
```json
{
  "approvalId": "uuid",
  "orgId": "uuid",
  "action": "approve" | "reject",
  "iat": 1234567890,
  "exp": 1234567890
}
```

Two tokens generated per notification (one approve, one reject). The route:
- Verifies signature and expiry
- Checks approval is still `pending`
- Calls the same business logic as the session-based approve/reject routes
- Returns a simple HTML response (no React — avoids redirect loop for WhatsApp preview bots)

The JWT is **not stored in the DB**. Stateless verification. Revocation is handled by checking `approval.status !== "pending"` — once resolved, both links become no-ops.

### WhatsApp Provider Choice

**Recommended: Twilio (official Meta BSP)** — HIGH confidence.

Rationale: Pruma will be a SaaS product sending messages on behalf of Pruma's own business (notifications about approvals in their system). This is a single sender use case, not white-label WhatsApp for clients. Twilio Verify/Conversations supports template messages (required for business-initiated messages), has a Node.js SDK, and operates legally in Brazil through Meta's BSP programme.

**Do not use Evolution API or WAHA** for production. These use WhatsApp Web sessions (unofficial), violate Meta ToS, and risk number bans. Acceptable for internal demos, not for a SaaS product.

**Alternative: Zenvia** — Brazilian BSP, PIX-native billing, local support. Valid choice if Twilio pricing is a concern for BR market. Both use the same Cloud API surface.

### Schema Change

No new table. Add to `users`:
```sql
phone          text,          -- E.164 format e.g. "+5511999998888"
phoneVerified  timestamp,     -- null = unverified, non-null = verified
```

WhatsApp notifications only sent to members where `phoneVerified IS NOT NULL`.

### New API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/approvals/[id]/resolve` | GET | Stateless JWT-based approve/reject from WhatsApp link |
| `/api/user/phone` | PATCH | Save phone number, trigger OTP send |
| `/api/user/phone/verify` | POST | Confirm OTP, set `phoneVerified` |

### Integration Point

In `POST /api/n8n/approvals` (after DB insert, fire-and-forget):
```typescript
void sendWhatsAppNotifications(approval, org, members)
// members filtered to where phoneVerified IS NOT NULL
```

New file: `src/lib/whatsapp.ts` — mirrors `src/lib/email.ts` structure.

---

## Feature 2: In-App Notifications (Bell Icon)

### Architecture

**Polling, not SSE.** Database-backed. The bell icon polls every 30s for unread count; dropdown fetches full list on open.

### Schema: `notifications` table

```sql
CREATE TABLE notifications (
  id              text PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            text NOT NULL,           -- "approval_pending" | "approval_resolved" | "sla_warning" | "sla_expired"
  title           text NOT NULL,
  body            text,
  resource_type   text,                    -- "approval"
  resource_id     text,                    -- FK-like, not enforced (approval may be deleted)
  read_at         timestamp,               -- null = unread
  created_at      timestamp NOT NULL DEFAULT now()
);

CREATE INDEX notif_user_unread_idx ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX notif_org_idx         ON notifications(organization_id);
```

No `updated_at` — notifications are immutable after creation. `read_at` is the only mutable field.

### New API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/notifications` | GET | List recent notifications (last 30, paginated) |
| `/api/notifications/unread-count` | GET | Returns `{ count: number }` — the polling target |
| `/api/notifications/[id]/read` | PATCH | Mark one as read |
| `/api/notifications/read-all` | POST | Mark all as read for user |

### Delivery Mechanism

Notifications are created as a side-effect in the routes that trigger events:
- `POST /api/n8n/approvals` → creates `approval_pending` notification for each eligible member
- `POST /api/approvals/[id]/approve|reject` → creates `approval_resolved` for the `assignedTo` user (if set)
- SLA cron → creates `sla_warning` (1h before) and `sla_expired` notifications

All notification writes are fire-and-forget (`void`), same pattern as email.

### Client Polling

```
Bell component → poll /api/notifications/unread-count every 30s
On dropdown open → fetch /api/notifications
On read → PATCH /api/notifications/[id]/read
```

Polling adds ~2 DB reads/user/minute at idle. For the scale Pruma is at (zero to first paying customers), this is negligible. Revisit with Upstash Redis pub/sub if concurrency becomes a concern.

---

## Feature 3: Phone OTP

### Architecture

Phone OTP follows the same pattern as `passwordResetTokens`: generate a random token, hash it (SHA-256), store hash with expiry, verify by re-hashing the user-supplied code.

For SMS OTP the "token" is a short 6-digit numeric code. The code itself is hashed for storage (prevents leakage from DB read).

### Schema: `phone_otp_tokens` table

```sql
CREATE TABLE phone_otp_tokens (
  id          text PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone       text NOT NULL,       -- E.164, the number being verified
  code_hash   text NOT NULL,       -- SHA-256(6-digit code)
  expires_at  timestamp NOT NULL,
  used_at     timestamp,
  created_at  timestamp NOT NULL DEFAULT now()
);

CREATE INDEX phone_otp_user_idx ON phone_otp_tokens(user_id);
```

Expiry: 10 minutes. One active token per user at a time (enforce in application layer: invalidate previous on new request, not DB constraint — avoids race conditions).

### Provider

**Recommended: Zenvia** — Brazilian provider, BRL pricing, local support number, established Node.js SDK. Pricing is per-message and cheaper than Twilio for domestic BR traffic. The `zenvia-sms-core` npm package provides a ready Node.js client.

**Alternative: Twilio Verify** — if already using Twilio for WhatsApp, consolidating vendors simplifies billing and secrets management. Twilio Verify handles OTP lifecycle (send + verify) without needing the `phone_otp_tokens` table at all — Twilio stores the code server-side and exposes a verify endpoint. This is architecturally cleaner but creates an external dependency for a core security flow.

**Recommendation:** Use Zenvia for SMS (same vendor as potential WhatsApp if not using Twilio), keep OTP tokens in DB for full control and auditability. New file: `src/lib/sms.ts`.

### New API Routes

Covered under Feature 1 routes: `/api/user/phone` and `/api/user/phone/verify`.

---

## Feature 4: Notification Preferences

### Architecture

Per-user, per-channel boolean flags. Not a property-bag (new channels are infrequent; typed columns are safer with Drizzle schema).

### Schema: `notification_preferences` table

```sql
CREATE TABLE notification_preferences (
  id              text PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Channels
  email_enabled     boolean NOT NULL DEFAULT true,
  whatsapp_enabled  boolean NOT NULL DEFAULT true,
  in_app_enabled    boolean NOT NULL DEFAULT true,
  -- Event types (add columns per type as product grows)
  notify_approval_pending   boolean NOT NULL DEFAULT true,
  notify_approval_resolved  boolean NOT NULL DEFAULT true,
  notify_sla_warning        boolean NOT NULL DEFAULT true,
  created_at  timestamp NOT NULL DEFAULT now(),
  updated_at  timestamp NOT NULL DEFAULT now(),

  UNIQUE(user_id, organization_id)
);
```

Row created lazily on first save (or with defaults on first notification dispatch — check for existence, insert defaults if missing).

### New API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/user/notification-preferences` | GET | Fetch preferences for current user+org |
| `/api/user/notification-preferences` | PATCH | Update one or more flags |

### Integration

Before sending WhatsApp/email/in-app, each notification dispatcher reads preferences:
```typescript
const prefs = await getOrCreatePrefs(userId, orgId)
if (prefs.whatsapp_enabled && prefs.notify_approval_pending) {
  void sendWhatsApp(...)
}
```

---

## Feature 5: SLA / Deadline

### Architecture

`approvals.expires_at` **already exists** in the schema. No new column needed on `approvals`. The gap is: (a) cron to auto-reject expired approvals, (b) cron to send 1h-before warning notifications, (c) UI to display countdown.

### Cron Strategy (Vercel Free Tier)

Two options, both within Vercel free constraints:

**Option A — New daily cron slot (recommended):**
Add to `vercel.json`:
```json
{ "path": "/api/maintenance/process-sla", "schedule": "0 * * * *" }
```
Wait — Vercel free tier only supports `0 X * * *` (daily). Hourly is NOT available on Hobby.

**Confirmed constraint:** Vercel Hobby cron = daily only. This means SLA auto-expiry runs once per day, not at the exact `expires_at` time.

**Consequence:** `expiresAt` is a soft deadline. The approval is not auto-rejected at the exact minute, but at the next daily cron run (worst case: 23h late). This is acceptable for MVP — the UI shows the deadline, the cron cleans up.

**Option B — GitHub Actions scheduled (workaround for hourly):**
GitHub Actions has no hourly-cron restriction. A `.github/workflows/sla-check.yml` with `schedule: '*/60 * * * *'` calls the maintenance endpoint. This is the documented workaround for Vercel free-tier retry-failed-callbacks. Valid but adds complexity.

**Recommendation for MVP:** Option A (daily cron at 06:00 UTC). Upgrade to Option B only if customers complain about stale expired approvals.

### New `/api/maintenance/process-sla` Route

```typescript
// 1. Auto-reject approvals where status = "pending" AND expires_at < now()
//    Sets status = "rejected", comment = "Expirado automaticamente por SLA"
//    Triggers n8n callback (same path as manual reject)
//    Creates "sla_expired" in-app notification for org members
// 2. Send 1h warning: find approvals where status = "pending"
//    AND expires_at BETWEEN now() AND now() + 1h
//    AND no "sla_warning" notification exists yet for this approval
//    Creates "sla_warning" in-app + WhatsApp notification
```

The "already sent warning" check avoids duplicate notifications when cron runs daily (the 1h window is a daily window check, not a real-time one — this is a known limitation of daily crons).

### Schema Addition

Add to `approvals` for SLA warning dedup:
```sql
sla_warning_sent_at  timestamp   -- set when warning notification is dispatched
```

No new table.

### New API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/maintenance/process-sla` | GET | Cron: auto-reject expired + send warnings |

---

## Feature 6: Audit Log

### Architecture

Append-only event table. No UPDATE or DELETE ever issued against this table. Written as a side-effect of business-logic routes. Never blocks the primary operation (fire-and-forget write).

### Schema: `audit_logs` table

```sql
CREATE TABLE audit_logs (
  id              text PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id        text REFERENCES users(id) ON DELETE SET NULL,
  actor_email     text,            -- denormalized: preserved even if user is deleted
  action          text NOT NULL,   -- "approval.approved" | "approval.rejected" | "approval.created" | "member.invited" | "member.removed" | "billing.plan_changed" | "billing.canceled"
  resource_type   text NOT NULL,   -- "approval" | "member" | "billing"
  resource_id     text,            -- UUID of the affected resource
  metadata        jsonb,           -- action-specific payload (comment, decision values, etc.)
  ip_address      text,            -- from request headers
  created_at      timestamp NOT NULL DEFAULT now()
);

CREATE INDEX audit_org_time_idx      ON audit_logs(organization_id, created_at DESC);
CREATE INDEX audit_resource_idx      ON audit_logs(resource_type, resource_id);
CREATE INDEX audit_actor_idx         ON audit_logs(actor_id);
```

No `updated_at`. The PK is `text` UUID per project convention.

**Why denormalize `actor_email`:** Users can be deleted. The audit log must preserve who did what. Store email at write time, not as a join-time lookup.

**Why `jsonb` metadata:** Approval-specific data (comment, decisionValues, filenames) varies by action type. Avoids many nullable columns.

### What to Capture

| Action | Trigger Route | Metadata |
|---|---|---|
| `approval.created` | `POST /api/n8n/approvals` | `{ title, flowId }` |
| `approval.approved` | `POST /api/approvals/[id]/approve` | `{ comment, decisionValues }` |
| `approval.rejected` | `POST /api/approvals/[id]/reject` | `{ comment }` |
| `approval.expired` | SLA cron | `{ expiresAt }` |
| `member.invited` | `POST /api/organizations/invite` | `{ email, role }` |
| `member.removed` | `DELETE /api/organizations/members/[id]` | `{ userId, role }` |
| `billing.plan_changed` | `POST /api/billing/change-plan` | `{ from, to }` |
| `billing.canceled` | `POST /api/billing/cancel` | `{}` |

Actor for n8n-triggered actions (approval.created): set `actor_id = null`, `actor_email = "n8n-webhook"`.

### New API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/audit-logs` | GET | Paginated list for current org (admin/owner only) |

No write route — audit logs are only written by server-side business logic, never by client requests.

### Helper Function

```typescript
// src/lib/audit.ts
export async function writeAuditLog(entry: {
  organizationId: string
  actorId: string | null
  actorEmail: string | null
  action: string
  resourceType: string
  resourceId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
}): Promise<void>
```

Called as `void writeAuditLog(...)` — fire-and-forget. Never throws into the parent request.

---

## Feature 7: Self-Service Billing

### Architecture

The existing `asaas.ts` lib already has `subscriptions.cancel(id)` and `subscriptions.get(id)`. The gaps are:
1. **Plan change** (upgrade/downgrade): Asaas `PUT /subscriptions/{id}` supports changing `value` and `cycle`. Verified from official docs.
2. **Cancellation UI**: The DELETE endpoint exists in the lib. Needs a UI confirmation flow and webhook handler to update `subscriptionStatus`.
3. **Invoice history**: `asaas.payments.list(subscriptionId)` already exists. Needs a route and UI.

### Schema Changes

No new columns needed. Asaas webhook already updates `subscriptionStatus`. Add to `organizations` for plan change tracking:
```sql
current_plan_id    text,    -- human-readable plan identifier ("starter" | "pro" | "enterprise")
current_plan_label text,    -- display name
```

These are denormalized from Asaas plan metadata for UI display without an API call.

### New API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/billing/change-plan` | POST | Update subscription value/cycle via Asaas PUT |
| `/api/billing/cancel` | POST | Cancel subscription via Asaas DELETE |
| `/api/billing/invoices` | GET | List payment history via Asaas GET /payments |

### Cancellation Flow

Cancellation must:
1. Call `asaas.subscriptions.cancel(org.asaasSubscriptionId)`
2. Set `organizations.subscriptionStatus = "canceled"` optimistically (Asaas webhook will confirm)
3. Write `billing.canceled` audit log entry
4. Return success — next request hits proxy.ts subscription guard and redirects to billing page

**Important:** Do not delete the `asaasSubscriptionId` on cancel — it is needed to query invoice history.

### Existing Webhook Handler

`/api/webhooks/asaas` already handles `SUBSCRIPTION_DELETED` and updates `subscriptionStatus`. No changes needed there.

---

## Build Order (Feature Dependencies)

```
Phone (users.phone + users.phoneVerified columns)
  └── WhatsApp notifications (requires phoneVerified)
  └── Phone OTP (phone_otp_tokens table)

Notifications table
  └── In-app notifications (notifications table)
  └── SLA cron (writes notifications as side-effect)
  └── WhatsApp notifications (reads preferences)

Notification preferences (notification_preferences table)
  └── All notification channels (WhatsApp, email, in-app dispatch)

Audit log (audit_logs table + lib/audit.ts)
  └── Self-service billing (billing audit entries)
  └── All approval actions (retroactively addable)

SLA/deadline
  └── notifications table (must exist to write sla_warning)
  └── approvals.sla_warning_sent_at (new column)

Self-service billing
  └── audit_logs (billing events should be logged)
```

### Recommended Phase Order

1. **Phone OTP** — users.phone/phoneVerified + phone_otp_tokens + SMS provider. No dependencies. Unblocks WhatsApp.
2. **Audit log infrastructure** — audit_logs table + lib/audit.ts. Low risk, additive. Can be wired into existing routes immediately.
3. **In-app notifications** — notifications table + polling routes + bell UI. Independent of WhatsApp.
4. **Notification preferences** — notification_preferences table + settings UI. Wire into WhatsApp + in-app dispatch.
5. **WhatsApp** — signed JWT route + Twilio/Zenvia integration + fire-and-forget in n8n/approvals. Requires Phase 1 (phone verified).
6. **SLA/deadline** — process-sla cron + sla_warning_sent_at + UI countdown. Requires Phase 3 (notifications exist).
7. **Self-service billing** — change-plan + cancel + invoices routes + UI. Requires Phase 2 (audit log for billing events).

---

## Component Boundaries

| Component | Responsibility | New Files |
|---|---|---|
| `src/lib/whatsapp.ts` | Send WhatsApp template messages, generate signed JWT links | New |
| `src/lib/sms.ts` | Send SMS OTP via Zenvia/Twilio | New |
| `src/lib/audit.ts` | `writeAuditLog()` helper, fire-and-forget | New |
| `src/lib/notifications.ts` | `createNotification()` helper for in-app writes | New |
| `db/schema.ts` | New tables + columns (see per-feature sections) | Modified |
| `src/proxy.ts` | No changes needed | — |
| `apps/web/vercel.json` | Add `/api/maintenance/process-sla` cron slot | Modified |

---

## Migration Strategy

All schema changes use Drizzle migrations (`npm run db:generate` then commit SQL). Per `db/CLAUDE.md` rules:
- Never run `drizzle-kit push` in production
- Always verify `when` field is chronologically increasing in the journal
- Each new table/column = one migration file per logical group (not one per column)

Suggested grouping:
- Migration A: `users.phone`, `users.phone_verified`, `phone_otp_tokens`
- Migration B: `notifications`, `notification_preferences`
- Migration C: `audit_logs`
- Migration D: `approvals.sla_warning_sent_at`, `organizations.current_plan_id`, `organizations.current_plan_label`

---

## Confidence Assessment

| Area | Confidence | Notes |
|---|---|---|
| Schema design | HIGH | Based on existing schema.ts + standard patterns |
| Vercel cron constraints | HIGH | Verified from vercel.json + CLAUDE.md + community sources |
| SSE impossibility on Hobby | HIGH | Confirmed: 10s timeout kills long-lived connections |
| Asaas plan change endpoint | MEDIUM | PUT /subscriptions/{id} supports value/cycle; exact `value` param name needs verification against live sandbox |
| WhatsApp JWT link pattern | HIGH | Standard stateless JWT approach, no DB dependency |
| WhatsApp provider (Twilio vs Zenvia) | MEDIUM | Both are valid BSPs; final choice depends on pricing comparison at time of implementation |
| SLA daily-only limitation | HIGH | Vercel Hobby confirmed daily cron only |

---

## Sources

- Existing `apps/web/db/schema.ts` — schema baseline
- Existing `apps/web/vercel.json` — cron slots confirmed
- `apps/web/src/app/CLAUDE.md` — fire-and-forget email pattern, multi-tenant rules
- `apps/web/db/CLAUDE.md` — migration workflow
- Asaas official docs: https://docs.asaas.com/reference/update-existing-subscription
- Vercel SSE/polling constraints: https://github.com/vercel/next.js/discussions/48427
- Zenvia Node.js SDK: https://github.com/zenvia/zenvia-sms-core
- Audit log patterns: https://medium.com/@sehban.alam/lets-build-production-ready-audit-logs-in-postgresql-7125481713d8
