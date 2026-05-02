# Technology Stack — Additions for Milestone 2

**Project:** Pruma IA
**Researched:** 2026-05-02
**Mode:** Brownfield — additions only; existing stack not re-researched

---

## Scope

Five feature areas require new dependencies or patterns on top of the existing stack:

1. WhatsApp Business API notifications + one-click approval via signed JWT link
2. In-app real-time notifications (bell icon, unread count, dropdown)
3. OTP verification (email on registration, phone in settings)
4. 2FA TOTP (Google Authenticator, per-org opt-in)
5. Self-service billing via Asaas (plan change, cancellation, invoice history)

---

## 1. WhatsApp Notifications

### Recommendation: Twilio WhatsApp API (Cloud API, direct)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `twilio` npm | ^6.0.0 | Send WhatsApp template messages | Official SDK, typed, maintained. Latest stable as of 2026-05 |

**Rationale.**
Meta deprecated the on-premise WhatsApp API in October 2025. All new integrations must use the Cloud API, accessed either directly or through a Business Solution Provider (BSP).

Direct via Twilio is the correct choice for Pruma because:
- Twilio is a BSP but exposes a pure REST API requiring only a `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_WHATSAPP_NUMBER` env var — no third-party dashboard dependency at runtime.
- Pricing is transparent: ~$0.005 Twilio platform fee + Meta utility rate (~$0.0068/msg in Brazil). Marketing rate is $0.0625/msg — Pruma must register templates as **Utility** (approval alert) or **Authentication** (OTP), not Marketing.
- Brazilian-focused SaaS BSPs (Zenvia, Take Blip) target enterprise/no-code buyers, add 10-30% markup, and require account managers. Wrong fit for solo developer.
- Evolution API (open-source self-hosted) requires managing a separate Docker service with PostgreSQL + Redis — infra burden not justified when cloud API is this simple.
- `twilio` v6 is TypeScript-native with full type definitions; no `@types/twilio` needed.

**Signed JWT link pattern.**
The one-click approval link must carry `{ approvalId, action: "approve"|"reject", exp }` signed with `APPROVAL_JWT_SECRET` (HS256, 24h TTL). The WhatsApp template receives the full URL as a variable. The existing `/api/approvals/[id]/approve` and `/api/approvals/[id]/reject` routes validate the JWT before committing. No new route needed — the existing routes already enforce `organizationId` isolation; the JWT adds a second layer for unauthenticated-but-authorized access.

**What NOT to use.**
- Evolution API: valid for high-volume SaaS resellers who need multi-tenant WhatsApp accounts per customer. Overkill here.
- Zenvia/Take Blip: no NPM SDK; require dedicated dashboards; wrong audience.
- Direct Meta Cloud API (without BSP): possible but requires more webhook plumbing. Twilio abstracts delivery receipts and template status callbacks cleanly.

---

## 2. In-App Real-Time Notifications

### Recommendation: Upstash Realtime (`@upstash/realtime` ^1.0.2) + SSE

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@upstash/realtime` | ^1.0.2 | Managed SSE pub/sub for Next.js | Purpose-built for App Router + Vercel; free tier adequate |
| Upstash Redis | — (managed) | Message bus backing Realtime | Free tier: 500K commands/month, 256 MB |

**Rationale.**
Vercel free tier has hard constraints that eliminate several options:
- **WebSocket persistent connections are not supported** in Vercel serverless functions. `ws` is already in `package.json` but it runs server-side only during local dev; deploying a WS server to Vercel requires Edge Runtime upgrade or an external WS service.
- **SSE with plain in-memory pub/sub** fails in multi-instance serverless deployments: two concurrent users may land on different function instances with no shared state.
- **Polling** (e.g. `setInterval` fetching `/api/notifications/unread-count`) is the simplest fallback but incurs per-request Vercel function invocations; 5-second polling for a small app is acceptable but generates constant cold starts.

`@upstash/realtime` v1.0.2 (released 2026-02-27) solves this cleanly: it is SSE under the hood, backed by Upstash Redis Streams as the shared message bus, with a single `handle()` export for the App Router route and a `useRealtime` hook for the client. The library targets exactly this stack — the Upstash blog documents a production-ready example with Next.js 16.

**Vercel timeout caveat.** Vercel serverless SSE connections are killed at 25 seconds. `@upstash/realtime` handles reconnection automatically on the client side via `EventSource` retry. Add `export const dynamic = "force-dynamic"` to the SSE route handler or SSE responses will be statically cached and streaming will silently break.

**Free tier adequacy.** Pruma targets small orgs of 2-20 approvers. 500K Redis commands/month at 5 commands per notification event = 100K notification events/month before hitting the ceiling. That is comfortably above MVP scale. Upgrade path: Upstash Pay-as-you-go at $0.2 per 100K commands.

**Alternative considered: plain SSE with no Redis.** Works for single-instance local dev but breaks silently on Vercel multi-instance. Rejected.

**Alternative considered: Pusher.** Free tier (200 concurrent connections, 200K messages/day) is more limited than Upstash, adds a vendor dependency, and has worse Next.js App Router integration. Rejected.

---

## 3. OTP Verification (Email + Phone/SMS)

### Recommendation: Custom implementation — no new library needed

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `crypto` (Node built-in) | built-in | Generate 6-digit numeric OTP | Cryptographically random, zero dependency |
| Drizzle + PostgreSQL | existing | Store hashed OTP with expiry | Reuse existing DB infrastructure |
| Resend | existing | Deliver email OTP | Already wired; fire-and-forget matches email notification pattern |

**Rationale.**
Email OTP does not require a new library. The implementation is:
1. Generate 6-digit code: `crypto.randomInt(100000, 999999).toString()`
2. Hash with `bcryptjs` (already in `package.json`): store `{ hash, expiresAt: now + 10min, userId }`
3. Send via existing `email.ts` abstraction (Resend in prod, Mailpit in dev)
4. Verify: `bcrypt.compare(inputCode, storedHash)` + `expiresAt > now` + delete row on success

**Schema addition needed:** `email_verification_tokens` table (`id`, `userId`, `tokenHash`, `expiresAt`, `createdAt`). One row per user; upsert on resend.

**Phone/SMS OTP:** The PROJECT.md excludes SMS as out of scope ("Notificação por SMS direto (sem WhatsApp) — WhatsApp cobre o caso de uso com mais contexto"). Phone OTP verification means verifying a phone number via WhatsApp OTP (Authentication template category) or simply storing it as unverified until WhatsApp delivery confirms it. Confirm scope before implementing.

**What NOT to use.**
- `otplib` / `speakeasy`: these are TOTP (time-based rotating) libraries for 2FA, not for one-shot email OTP flows. Wrong tool.
- Redis for OTP storage: introduces Upstash as a dependency at OTP phase, before it's needed for notifications. Use PostgreSQL; the TTL pattern with a cron cleanup (already exists as daily cron) suffices.
- Third-party OTP services (MojoAuth, etc.): overkill for a custom flow; adds vendor and cost.

---

## 4. Two-Factor Authentication (TOTP)

### Recommendation: `otplib` ^13.4.0 + `qrcode` ^1.5.4

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `otplib` | ^13.4.0 | TOTP secret generation and verification | TypeScript-first, RFC 6238 compliant, actively maintained, zero external dependencies |
| `qrcode` | ^1.5.4 | Generate QR code data URL for setup | Standard, maintained, works server-side |

**Rationale.**
`otplib` is the correct library because:
- It is TypeScript-first with bundled types (`@types/otplib` is not needed).
- It is the only actively maintained TOTP library in the Node.js ecosystem as of 2025: `speakeasy` is unmaintained (last publish 2017; the newer `libotp` fork is maintained by the same org but under a different name with less adoption). `otplib` v13.4.0 was published recently and has 8M+ weekly downloads.
- RFC 6238 compliant with configurable window for clock skew.
- Works in Node, Bun, and browser — useful if 2FA verification is ever needed in Edge Runtime.

**What NOT to use.**
- `speakeasy` (original): unmaintained since 2017. Security risk.
- `libotp` (speakeasy fork): maintained but low adoption; no benefit over `otplib`.
- `@simplewebauthn` for passkeys: passkeys are out of scope; TOTP is explicitly requested.

**Schema additions needed.**
- `users` table: add `totpSecret TEXT` (encrypted, see pitfalls), `totpEnabled BOOLEAN DEFAULT false`, `totpBackupCodes TEXT[]` (hashed backup codes).
- TOTP is configured at the user level but gated at the org level (`organizations.require2fa BOOLEAN DEFAULT false`). This matches "configurável por org" from PROJECT.md.

**Integration with NextAuth v5.**
NextAuth v5 has no built-in 2FA support. The pattern is:
1. On `authorize` callback: if user has `totpEnabled=true`, return a partial session flag (e.g. `{ ...user, requires2fa: true }`) without marking as fully authenticated.
2. Middleware (`proxy.ts`) redirects users with `requires2fa: true` to `/2fa/verify` for any protected route.
3. `/api/auth/2fa/verify` route validates the TOTP token, then updates the JWT to remove the `requires2fa` flag.

This requires a thin custom JWT claim — entirely feasible with NextAuth v5's `jwt()` callback.

---

## 5. Self-Service Billing (Asaas)

### Recommendation: Direct Asaas REST calls via existing `asaas.ts` lib — no new library

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Existing `asaas.ts` lib | — | Extend with new endpoints | Pattern already established; avoid a third-party Asaas SDK |

**Rationale.**
Asaas does not have an official Node.js SDK. The project already has an `asaas.ts` module that makes authenticated `fetch` calls to `api.asaas.com/v3`. Extend this module with the following endpoints:

**Plan change (PUT /v3/subscriptions/{id}).**
IMPORTANT CAVEAT: The `value` (subscription amount) field is NOT in the `SubscriptionUpdateRequestDTO` schema. The `PUT /v3/subscriptions/{id}` endpoint cannot change the billing amount directly. The documented workaround for plan upgrades/downgrades is:
1. `DELETE /v3/subscriptions/{id}` to cancel the current subscription.
2. `POST /v3/subscriptions` to create a new subscription with the new value/cycle.
3. Handle proration manually if needed (Asaas has no built-in proration).

This is a significant UX and billing consideration: there will be a gap between cancellation and new subscription during which the guard in `proxy.ts` could block access. Mitigation: create the new subscription before deleting the old one, or add a grace period flag to the user's JWT claim.

**Cancellation (DELETE /v3/subscriptions/{id}).**
Soft cancel: `PUT` with `{ status: "INACTIVE" }` stops future billings but leaves the subscription in the system. The `subscriptionStatus` guard in `proxy.ts` already handles `INACTIVE` as blocked.
Hard cancel: `DELETE /v3/subscriptions/{id}` permanently removes the subscription. Asaas documentation does not specify whether pending (unpaid) charges are automatically cancelled when the subscription is deleted — assume they remain until explicitly cancelled via `DELETE /v3/payments/{id}`.

**Invoice history (GET /v3/subscriptions/{id}/payments).**
Returns all charges generated for the subscription. This is the correct endpoint for the billing history page — not `GET /v3/payments` which returns all payments across all customers.

**Plan change flow recommendation.**
For Pruma's MVP, implement only:
1. Downgrade/cancel → set `status: INACTIVE` via `PUT` (not `DELETE`). Preserves history.
2. Invoice history → `GET /v3/subscriptions/{id}/payments`.
3. Upgrade (tier change) → deferred until post-first-paying-customer; the delete-and-recreate pattern has billing edge cases that require QA with a real Asaas account.

---

## Alternatives Matrix

| Category | Recommended | Rejected | Reason |
|----------|-------------|----------|--------|
| WhatsApp | Twilio ^6.0.0 | Evolution API (self-hosted) | Infra burden; Vercel can't host WS servers |
| WhatsApp | Twilio ^6.0.0 | Zenvia / Take Blip | Enterprise BSP; no NPM SDK; wrong audience |
| Real-time | @upstash/realtime ^1.0.2 | WebSocket | Not supported on Vercel serverless |
| Real-time | @upstash/realtime ^1.0.2 | Pusher | Worse free tier; less Next.js App Router fit |
| Real-time | @upstash/realtime ^1.0.2 | Polling | Works but constant cold starts on Vercel free |
| TOTP | otplib ^13.4.0 | speakeasy | Unmaintained since 2017 |
| OTP | crypto (built-in) | otplib for OTP | otplib is for TOTP/HOTP rotation, not one-shot codes |
| OTP storage | PostgreSQL (existing) | Upstash Redis | Adds infra dependency before it's needed |
| Billing | Direct Asaas REST | Third-party Asaas SDK | No maintained official SDK exists |

---

## Installation

```bash
# WhatsApp notifications
npm install twilio

# In-app real-time notifications
npm install @upstash/realtime

# 2FA TOTP
npm install otplib qrcode
npm install -D @types/qrcode

# OTP email verification: no new packages (crypto + bcryptjs + Resend already installed)

# Billing: no new packages (extend existing asaas.ts)
```

---

## Environment Variables (additions)

```
# WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+1415XXXXXXX

# Approval JWT signing (WhatsApp one-click link)
APPROVAL_JWT_SECRET=    # 32+ char random secret, separate from NextAuth secret

# Upstash Realtime
UPSTASH_REALTIME_URL=
UPSTASH_REALTIME_TOKEN=

# 2FA TOTP secret encryption
TOTP_SECRET_ENCRYPTION_KEY=  # AES-256 key for encrypting stored TOTP secrets
```

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| WhatsApp / Twilio | HIGH | Official docs + npm confirmed; Meta Cloud API deprecation of on-premise verified |
| Upstash Realtime | HIGH | Official blog + npm package confirmed; v1.0.2 published 2026-02-27 |
| OTP via built-ins | HIGH | Standard pattern; no external verification needed |
| TOTP / otplib | HIGH | npm confirmed v13.4.0; TypeScript-first; 8M+ weekly downloads |
| Asaas plan change | MEDIUM | `value` field absence in schema confirmed via official docs. Delete-and-recreate pattern documented but not officially blessed by Asaas |
| Vercel SSE 25s timeout | MEDIUM | Multiple community sources agree; no official Vercel doc URL found in search results |

---

## Sources

- [Twilio WhatsApp API overview](https://www.twilio.com/docs/whatsapp/api)
- [twilio npm package](https://www.npmjs.com/package/twilio)
- [Meta deprecated on-premise API (October 2025)](https://www.messagecentral.com/blog/whatsapp-business-api-complete-guide)
- [Upstash Realtime npm package](https://www.npmjs.com/package/@upstash/realtime)
- [Upstash Realtime — Next.js 16 blog post](https://upstash.com/blog/nextjs-16-realtime-notifications)
- [Upstash Realtime quickstart docs](https://upstash.com/docs/realtime/overall/quickstart)
- [Upstash Redis free tier pricing](https://upstash.com/docs/redis/overall/pricing)
- [SSE vs WebSocket vs Polling on Vercel — DEV Community](https://dev.to/haraf/server-sent-events-sse-vs-websockets-vs-long-polling-whats-best-in-2025-5ep8)
- [otplib npm](https://www.npmjs.com/package/otplib)
- [otplib GitHub](https://github.com/yeojz/otplib)
- [Asaas update subscription endpoint](https://docs.asaas.com/reference/update-existing-subscription)
- [Asaas delete subscription endpoint](https://docs.asaas.com/reference/remove-subscription)
- [Asaas list subscription payments](https://docs.asaas.com/reference/list-payments-of-a-subscription)
- [WhatsApp pricing update July 2025 — YCloud](https://www.ycloud.com/blog/whatsapp-api-pricing-update)
- [WhatsApp BSP hidden costs — Whapi.cloud](https://whapi.cloud/blog/whatsapp-bsp-pricing-hidden-costs-2026)
