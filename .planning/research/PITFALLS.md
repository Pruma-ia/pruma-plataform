# Domain Pitfalls

**Domain:** SaaS multi-tenant de aprovações humanas (Next.js 16 + Vercel + Asaas + WhatsApp)
**Researched:** 2026-05-02
**Scope:** Brownfield additions — WhatsApp notifications, in-app real-time, OTP/2FA, self-service billing, SLA auto-reject, signed JWT links

---

## Critical Pitfalls

Mistakes that cause rewrites, security incidents, or data integrity failures.

---

### Pitfall 1: Asaas Webhook Idempotency — Duplicate Events Change Subscription State Twice

**What goes wrong:** Asaas guarantees "at least once" delivery. The existing `/api/webhooks/asaas/route.ts` does a blind `UPDATE ... WHERE asaasSubscriptionId = X` with no idempotency check. A duplicate `PAYMENT_RECEIVED` following an already-processed `PAYMENT_OVERDUE` flips `subscriptionStatus` to `active` correctly — but a duplicate `PAYMENT_OVERDUE` after `PAYMENT_RECEIVED` flips an active org back to `past_due`. No deduplication = eventual state corruption under retry storms.

**Why it happens:** The current handler has no `processedWebhookEvents` table. Every delivery mutates the row unconditionally.

**Consequences:** Org incorrectly locked out of dashboard. Support ticket. Manual DB fix. Revenue loss.

**Prevention:**
1. Add a `processed_webhook_events(event_id TEXT PRIMARY KEY, processed_at TIMESTAMPTZ)` table with a unique constraint on `event_id`.
2. On each webhook arrival: INSERT OR IGNORE. If 0 rows inserted, return 200 immediately without processing.
3. Only update `organizations` after confirming the event is new.
4. Respond 200 to Asaas only after the event is persisted (not before).

**Detection:** Unexpected transitions in `subscriptionStatus` with no billing action by the customer. Monitor with a DB alert on `status = past_due` within 5 min of `status = active` for the same org.

**Phase:** Self-service billing (plan change / cancellation flow). Also retrofit to existing webhook handler before shipping.

**Security:** None beyond data integrity.

---

### Pitfall 2: JWT Session Carries Stale `subscriptionStatus` — Bypasses Proxy Guard After Payment

**What goes wrong:** `subscriptionStatus` is baked into the NextAuth JWT at login time and only refreshes on session rotation. A user whose org just paid may be stuck on `past_due` for up to the full JWT lifetime (default 30 days in NextAuth v5). Conversely, an org that cancels remains `active` in the JWT until expiry. The proxy.ts subscription guard reads `session.user.subscriptionStatus` from the JWT — this value is stale.

**Why it happens:** The Asaas webhook updates the DB row, but does not invalidate the user's session. JWT strategy has no server-side invalidation.

**Consequences:**
- Paid user cannot access dashboard immediately after payment — churns.
- Canceled user retains dashboard access for the full JWT lifetime — revenue leak.

**Prevention:**
1. On every guarded request in proxy.ts, do NOT trust `session.user.subscriptionStatus` alone. Add a lightweight DB check (`SELECT subscriptionStatus FROM organizations WHERE id = ?`) with a short in-memory TTL cache (e.g., 60s per orgId).
2. Alternatively: shorten JWT `maxAge` to 15 minutes, force re-issue via `unstable_update()` from NextAuth v5 after the Asaas webhook updates the DB.
3. After Asaas webhook updates org status, call `auth.update()` or signal the session layer to invalidate tokens for that orgId (requires database session strategy or a Redis session store).

**Detection:** User reports "still locked out after payment" OR security review of proxy.ts shows no DB re-check of subscription state.

**Phase:** Self-service billing. Affects any phase that introduces plan changes.

**Security:** HIGH — active paying customers locked out; canceled customers retain access.

---

### Pitfall 3: WhatsApp WABA Registration Blocks the Entire Phase — Not a Code Problem

**What goes wrong:** WhatsApp Cloud API requires Meta Business Verification before sending messages to real users. Verification requires: (1) a Meta Business Manager account; (2) a legal entity with a live website matching the entity name; (3) a dedicated phone number not registered on any WhatsApp app; (4) Meta reviews the business (1–15 business days, no SLA guarantee). Template messages require a separate approval per template category. For Brazil, certain WABA features have additional country-level restrictions.

**Why it happens:** Developers start coding the integration before the business account is verified, then discover the sandbox only allows pre-approved test templates and test phone numbers, blocking real-user testing.

**Consequences:** Phase ships with a non-functional notification channel. Business unblocking takes 2–4 weeks after code is done.

**Prevention:**
1. Submit WABA registration and Meta Business Verification in the sprint before coding starts — treat it as an infra prerequisite, not a code task.
2. Register templates (category: UTILITY for approval notifications) immediately after WABA approval — they require their own review cycle.
3. Prepare a BSP (e.g., Twilio, Infobip) as the integration layer rather than Meta Cloud API directly — BSPs have pre-verified WABA setup paths and handle retries.
4. For Brazil: verify that the CNPJ, business name, and address in Meta Business Manager exactly match legal documents. A mismatch is an automatic rejection.

**Detection (early warning):** WABA registration not started 3+ weeks before the target ship date for WhatsApp phase.

**Phase:** WhatsApp notification phase. Start WABA registration at phase planning, not during coding.

**Security:** None — pure timeline risk.

---

### Pitfall 4: WhatsApp Template Category Mismatch — Auto-Reject by Meta

**What goes wrong:** Approval notification templates labeled "UTILITY" that contain words like "free", "discount", "exclusive", or have promotional tone are auto-rejected by Meta. Templates with variables at the start or end of the message body are also auto-rejected. Rejected templates must be recreated (not edited) and resubmitted, adding days to the cycle.

**Why it happens:** Developers write the template copy without reading Meta's UTILITY category policy. The word "approve" or "pending" is fine; any promotional phrasing around it triggers rejection.

**Consequences:** No template = no WhatsApp messages. Delay of days to a week per rejection cycle.

**Prevention:**
1. Keep templates purely informational: "Você tem uma aprovação pendente em [flowName]. Acesse o link para decidir."
2. Never put a variable at position 1 or at the end of the body.
3. Use the WhatsApp template tester in Meta Business Manager before submission.
4. Do not use URL shorteners (bit.ly, etc.) in templates — the domain must match your verified business.
5. Prepare 2–3 template variants; submit all simultaneously so backup options are ready if one is rejected.

**Detection:** Meta rejection email within 15–30 minutes of template submission.

**Phase:** WhatsApp notification phase.

**Security:** None.

---

### Pitfall 5: WhatsApp 24-Hour Conversation Window — Notification-Only Messages Cost Money Outside It

**What goes wrong:** WhatsApp only allows free-form messages within a 24-hour window opened by the user contacting your number first. Approval notifications are business-initiated — the user never starts the conversation. Every approval notification is therefore a template message sent outside the window, which incurs a per-conversation cost and requires an approved template. Projects that model WhatsApp notifications as "free push messages" are surprised by per-message costs at scale.

**Why it happens:** Confusion between WhatsApp Business App (free) and WhatsApp Cloud API (template pricing model).

**Consequences:** Unexpected billing from BSP/Meta at scale. Budget overrun.

**Prevention:**
1. Model all approval notifications as paid template sends from day one.
2. Price the WhatsApp notification feature into the subscription plan margin.
3. Use UTILITY category templates — they are cheaper than MARKETING.
4. Add per-org opt-in tracking: only send WhatsApp to members who explicitly opt in, reducing volume.

**Detection:** Review Meta pricing page for UTILITY conversation rates per country before building.

**Phase:** WhatsApp notification phase.

**Security:** None.

---

### Pitfall 6: WhatsApp Quality Rating Degradation — Account Suspension at Scale

**What goes wrong:** Meta tracks a quality rating per Business Portfolio based on user block rate. New WABA accounts start at Tier 1 (1,000 unique users/day). Sending to users who did not opt in, or sending too frequently, causes blocks and lowers quality. Red quality triggers messaging limit reduction or temporary suspension (1, 3, 5, 7, or 30 days). A single number's poor performance drags the entire portfolio's tier.

**Why it happens:** Treating WhatsApp like email — sending to all org members regardless of preference, no unsubscribe mechanism.

**Consequences:** Account suspended. No WhatsApp notifications across all clients. Recovery takes days.

**Prevention:**
1. Explicit WhatsApp opt-in per user (stored in DB), separate from email notification preferences.
2. Implement delivery tracking and monitor block rates.
3. Never send more than one notification per pending approval per user — no reminder escalation without user consent.
4. Design the "1h before SLA" reminder as opt-in, not default-on.

**Detection:** Meta Business Manager quality dashboard shows Yellow or Red rating.

**Phase:** WhatsApp notification phase AND SLA reminders phase.

**Security:** None.

---

### Pitfall 7: Signed JWT Approval Links — Missing Org Isolation Allows Cross-Tenant Approval

**What goes wrong:** A JWT signed link for WhatsApp approval carries `approvalId` but if `organizationId` is not validated on the route that processes the decision, an attacker who intercepts or guesses a token for their own org can construct a request to approve/reject an approval from a different org. Multi-tenant isolation breaks at the link-based approval endpoint.

**Why it happens:** Link-based approval routes often skip the standard session `organizationId` check because they rely on the token being "the auth". The token may verify correctly without proving org membership.

**Consequences:** Cross-tenant data leak. Attacker approves/rejects another org's pending decisions.

**Prevention:**
1. JWT payload MUST include both `approvalId` AND `organizationId`.
2. Route handler must verify: `approval.organizationId === token.organizationId`. Reject if mismatch.
3. Pin `aud` (audience) claim to `whatsapp-approval` to prevent token reuse across other JWT-accepting endpoints.
4. Pin `iss` (issuer) claim to the Pruma service identifier.
5. Never derive algorithm from the token header — pin `HS256` or `RS256` server-side.

**Detection:** Security review of the link-based approval handler checks: does it validate `organizationId` from the token against the DB row?

**Phase:** WhatsApp JWT link phase.

**Security:** CRITICAL — cross-tenant data manipulation.

---

### Pitfall 8: Signed JWT Links Are Replayable After Decision — Replay Attack

**What goes wrong:** A JWT link with a long `exp` (e.g., 72h) can be replayed after the approval has already been decided. If the route is not idempotent for already-resolved approvals, a second invocation could trigger duplicate callbacks to n8n, corrupt audit logs, or re-open a resolved approval.

**Why it happens:** JWT expiry is treated as the only revocation mechanism. The token remains valid until expiry even after the approval it authorizes has been resolved.

**Consequences:** Duplicate n8n callbacks with conflicting outcomes. Confused workflow state.

**Prevention:**
1. On every link-based decision request: check `approval.status !== "pending"` before processing. Return 409 Conflict if already resolved.
2. Store the JWT `jti` (JWT ID) of consumed tokens in a `used_approval_tokens(jti TEXT PRIMARY KEY, used_at TIMESTAMPTZ)` table. Reject any token whose `jti` is already present.
3. Set a short `exp` (2–4 hours is sufficient for mobile-use approval flows).
4. On approval resolution through any channel (dashboard, link, API), mark the JWT as consumed.

**Detection:** Replaying the same link URL twice should return 409, not 200.

**Phase:** WhatsApp JWT link phase.

**Security:** HIGH — duplicate callbacks corrupt n8n workflow state.

---

### Pitfall 9: OTP Stored in Plaintext or Reversible Hash — Database Breach Exposure

**What goes wrong:** Storing OTP codes as plaintext or MD5/SHA-1 hashes in the DB means a database read exposes all active OTPs. Even a short-lived OTP is exploitable in a 5–10 minute window if the attacker has DB read access.

**Why it happens:** "It expires in 10 minutes anyway" reasoning. OTPs feel low-stakes because they are short-lived.

**Consequences:** Attacker with DB read access can verify any account without the actual OTP.

**Prevention:**
1. Hash OTPs with bcrypt (cost factor 10) before storing. Compare with `bcrypt.compare()` at verification time.
2. Alternatively: use a cryptographically random token (32 bytes, hex-encoded) stored as SHA-256 hash. The plaintext is sent via email/SMS and never stored.
3. Mark the OTP record as used immediately on first successful verification (set `usedAt = now()`).
4. Delete or expire OTP records after use — do not wait for the TTL.

**Detection:** Code review of the OTP generation route — is `bcrypt.hash()` or equivalent called before INSERT?

**Phase:** OTP email/phone verification phase.

**Security:** HIGH.

---

### Pitfall 10: OTP Brute-Force — 6-Digit Code Is Breakable Without Rate Limiting

**What goes wrong:** A 6-digit numeric OTP has only 1,000,000 possible values. Without strict per-user rate limiting on the verification endpoint, an attacker who knows the target email can brute-force the code within the validity window (10 min = 600 seconds, yielding ~1,666 guesses/second at 1 req/s per Vercel function).

**Why it happens:** The in-memory rate limiter in proxy.ts is per-IP, not per-user/per-token. An attacker can rotate IPs or use multiple Vercel edge regions.

**Consequences:** Account takeover during OTP verification window.

**Prevention:**
1. Limit OTP verification attempts to 5 per token. After 5 failures, invalidate the OTP and require a new one.
2. Store `attemptCount` on the OTP DB record and increment on each failed verification.
3. Lock the OTP after max attempts — do not just return "wrong code".
4. Apply rate limiting at user/token level (not just IP) using Upstash Redis or a DB counter.
5. Consider 8-digit numeric OTPs for phone verification (100M possibilities).

**Detection:** Penetration test: can you make more than 5 wrong guesses on the same OTP token?

**Phase:** OTP email/phone verification phase.

**Security:** CRITICAL — account takeover vector.

---

### Pitfall 11: TOTP Secret Stored Plaintext in DB — Full 2FA Bypass on DB Breach

**What goes wrong:** TOTP secrets (the Base32 seed shown as QR code) are static and never expire. If stored plaintext in the `users` table, a database breach gives the attacker every user's TOTP secret. The attacker can generate valid codes indefinitely, bypassing 2FA permanently — even after the user rotates their password.

**Why it happens:** "The secret is just a string, encrypt it later." It never gets encrypted.

**Consequences:** 2FA provides zero protection after a DB breach.

**Prevention:**
1. Encrypt TOTP secrets with AES-256-GCM before storing. Use a dedicated `TOTP_ENCRYPTION_KEY` env var (separate from `NEXTAUTH_SECRET`).
2. Store: `encrypted_secret` (AES ciphertext) + `iv` (initialization vector) + `auth_tag`.
3. Decrypt in memory only at verification time. Never log or return the plaintext secret after initial QR setup.
4. During 2FA setup: display the plaintext secret once (for QR code). Do not provide an API endpoint to retrieve it again.

**Detection:** Check DB schema for `totp_secret TEXT` column — if it exists without a paired `iv` column, it is stored plaintext.

**Phase:** 2FA TOTP phase.

**Security:** CRITICAL.

---

### Pitfall 12: TOTP Replay Attack — Same Code Valid Twice in the Same 30-Second Window

**What goes wrong:** TOTP codes are valid for 30 seconds (one time step). Without server-side tracking of used codes, two simultaneous requests with the same valid code both succeed. An attacker who observes a valid TOTP entry (e.g., via a phishing proxy) can replay it within the same window.

**Why it happens:** Libraries like `otplib` verify the code mathematically but do not track usage. Developers assume one-time means one-use but don't enforce it.

**Consequences:** Session hijacking within the 30-second window; phishing proxy attacks become trivially effective.

**Prevention:**
1. After successful TOTP verification, store the `(userId, code, timeStep)` combination in a `used_totp_codes` table.
2. Before accepting any TOTP: check this table. If present, reject.
3. TTL the table entries for 90 seconds (one time step ahead + current + one behind).
4. Allow max clock skew of ±1 time step (RFC 6238 recommendation) — but no more.

**Detection:** Submit the same 6-digit TOTP code twice within 30 seconds. The second submission should fail.

**Phase:** 2FA TOTP phase.

**Security:** HIGH.

---

### Pitfall 13: No 2FA Recovery Path — Org Locks Itself Out

**What goes wrong:** If an org mandates 2FA and a member loses their authenticator app (phone lost, no backup), there is no recovery path. The member cannot log in. If that member is the only owner, the org is permanently locked out.

**Why it happens:** Recovery codes and admin-override flows are deferred as "can add later." They never get added.

**Consequences:** Customer support emergency. Manual DB intervention required.

**Prevention:**
1. At 2FA enrollment, generate 8–10 single-use backup codes. Show them once, hash-store them (bcrypt).
2. Each backup code marks itself as used on consumption.
3. Org owner can reset a member's 2FA via the org settings panel (requires current owner auth).
4. Enforce at least 2FA enrollment confirmation (user must enter a valid TOTP code) before locking the secret.

**Detection:** QA test: enroll 2FA on a test account, "lose" the authenticator — can you recover without DB access?

**Phase:** 2FA TOTP phase.

**Security:** MEDIUM — availability risk more than security risk.

---

### Pitfall 14: SSE on Vercel — 10s/25s Function Timeout Kills Long-Lived Connections

**What goes wrong:** Vercel Hobby functions time out at 10 seconds; Pro at 60 seconds (Edge at 25s). SSE requires a persistent HTTP connection. On Vercel, functions are terminated after the timeout regardless of whether the SSE stream is still active. The browser's `EventSource` reconnects automatically, creating a polling-like pattern with cold-start overhead on every reconnect — effectively 10-second polling with cold start latency.

**Why it happens:** SSE works fine in local dev (no timeout). Developers ship and discover the behavior only in production under Vercel's function limits.

**Consequences:** Notification bell shows stale counts. Users miss approval notifications until next reconnect.

**Prevention:**
1. Do not use SSE for the primary notification delivery mechanism on Vercel free tier.
2. Use DB-backed polling: client polls `GET /api/notifications/unread-count` every 30 seconds. Simple, reliable, no connection state.
3. For real-time feel: add optimistic UI updates on action (approve/reject) rather than relying on push.
4. If SSE is used: implement heartbeat events every 20s + client-side `EventSource` auto-reconnect with `Last-Event-ID`. Accept the reconnect overhead.
5. For production real-time: Upstash Redis Pub/Sub + SSE costs ~$0 at Pruma's scale and works within Vercel's limits by using short-lived streams that reconnect.

**Detection:** Deploy to Vercel preview, hold the notification page open for 30+ seconds, observe whether the connection is killed.

**Phase:** In-app notifications phase.

**Security:** None — reliability risk.

---

### Pitfall 15: In-App Notification Polling Storm — Every Tab Polls Independently

**What goes wrong:** If the notification bell polls `GET /api/notifications` on a fixed interval, each open browser tab fires its own independent poll. A user with 3 tabs open triples the request rate. At 30-second polling with 3 tabs, that is 6 requests/minute per user. With 100 concurrent users and an average of 2 tabs: 400 requests/minute to a route that hits the DB.

**Why it happens:** Polling is implemented per-component, not coordinated across tabs.

**Consequences:** Unnecessary DB load. Could trigger the in-memory rate limiter in proxy.ts on `/api/` routes.

**Prevention:**
1. Use `BroadcastChannel` API or a shared `SharedWorker` to coordinate polling across tabs in the same browser session — only one tab polls at a time.
2. Alternatively: use `visibilitychange` event — only poll when the tab is visible.
3. Implement stale-while-revalidate with `swr` or React Query — cache the last unread count, show it immediately, revalidate in background.
4. Deduplicate at the API layer: if the same `organizationId` makes more than 10 notification requests/minute, return cached result from a short-lived in-memory or Redis cache.

**Detection:** Open 3 tabs of the dashboard, watch network requests — count unique polling requests per minute.

**Phase:** In-app notifications phase.

**Security:** None — performance risk.

---

### Pitfall 16: Vercel Cron Runs Only at Day Granularity (Free) — SLA Expiry Is Imprecise

**What goes wrong:** Vercel free tier only supports `0 X * * *` (once per day). SLA deadlines (`expiresAt`) on approvals can be hours in the future. A cron that runs once at 3am will miss all approvals that expired between 3:01am and 2:59am the next day, leaving expired approvals in `pending` state for up to 23h 59min.

**Why it happens:** The existing `retry-failed-callbacks` cron was already removed for this exact reason (as documented in CLAUDE.md). SLA auto-reject has the same constraint.

**Consequences:** Approvals show as pending long after their SLA expired. SLA feature provides no actual guarantee.

**Prevention:**
1. Do not rely solely on Vercel cron for SLA enforcement.
2. Primary mechanism: check `expiresAt < now()` lazily on every read of an approval (in the API route that fetches approvals). Mark as `expired`/`auto-rejected` on first read after deadline.
3. Supplementary mechanism: use GitHub Actions scheduled workflow (`*/15 * * * *`) or Upstash QStash to call `/api/maintenance/expire-approvals` every 15 minutes — no Vercel free tier restriction.
4. The Vercel daily cron is a catch-all backup, not the primary enforcement path.

**Detection:** Create an approval with `expiresAt = now() + 5 minutes`, wait 10 minutes, fetch it via API — is it auto-rejected?

**Phase:** SLA/deadline phase.

**Security:** None — product correctness risk.

---

### Pitfall 17: SLA Timezone — `expiresAt` Stored in UTC, Displayed in PT-BR Without Conversion

**What goes wrong:** The UI displays dates via `toLocaleString("pt-BR")` (correct), but if `expiresAt` is created server-side with `new Date(Date.now() + hours * 3600000)` from a server running in UTC, the displayed expiry to a Brazilian user will be 3 hours off from what they expect (BRT = UTC-3). Users set SLA to "end of business day 18:00" and the system expires at 18:00 UTC = 15:00 BRT.

**Why it happens:** Server uses UTC; UI displays in pt-BR locale but does not convert the reference timezone. The expectation mismatch is invisible during dev (server and browser may both be in UTC).

**Consequences:** SLA auto-reject fires at the wrong time from the user's perspective. Approvers get notifications "expired in 2 hours" when they have 5 hours left.

**Prevention:**
1. Always store `expiresAt` as UTC timestamps in the DB (correct and non-negotiable).
2. When creating `expiresAt` from user input (e.g., "deadline: 18:00 today"), accept the value as a timezone-aware ISO 8601 string from the client (which knows the browser timezone), not as a naive hour offset on the server.
3. In the UI: display `expiresAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })` — the `timeZone` option is mandatory, not optional.
4. For the "1h before SLA" reminder calculation: compute `expiresAt - 3600000` in UTC. Correct by definition.

**Detection:** Create an SLA from a browser set to America/Sao_Paulo, verify the stored UTC value is offset correctly. Display it back — does it show the expected local time?

**Phase:** SLA/deadline phase.

**Security:** None — correctness risk.

---

### Pitfall 18: Rate Limiter In-Memory Doesn't Protect OTP/2FA Routes Across Vercel Instances

**What goes wrong:** This is the documented debt (proxy.ts `authRateMap` is per-instance). For OTP brute-force and TOTP verification, the in-memory limiter only counts requests that hit the same Vercel function instance. Under load, Vercel spawns multiple instances. An attacker distributes 20 requests across 5 instances — each instance counts 4 requests, none trip the limit of 20.

**Why it happens:** Known debt, deferred because OTP and 2FA did not exist yet. Now they are being added and the debt becomes a security blocker.

**Consequences:** OTP and TOTP brute-force attacks succeed despite the rate limiter appearing to be in place.

**Prevention:** For OTP and TOTP routes specifically, rate limiting MUST be DB-backed or Redis-backed, not in-memory.
1. Use `@upstash/ratelimit` with Upstash Redis (free tier covers Pruma's scale). Drop-in replacement for the existing in-memory pattern.
2. Scope: OTP verify endpoint — 5 attempts per token (stored in the OTP record, DB-backed — no Redis needed). TOTP verify endpoint — 5 attempts per user per 15 min (Redis-backed).
3. This upgrade should happen in the OTP phase, before 2FA ships.

**Detection:** Distribute 30 OTP verification requests across multiple serverless instances simultaneously — do they all succeed despite the in-memory limit?

**Phase:** OTP phase (prerequisite before 2FA). Also blocks full resolution of the existing rate limiter debt.

**Security:** CRITICAL — the existing security control does not work for OTP/2FA.

---

### Pitfall 19: Neon Connection Exhaustion Under Notification Polling Load

**What goes wrong:** Neon has a connection limit per plan. The existing Drizzle ORM setup uses `neon()` HTTP driver (correct for serverless). However, adding polling routes for notifications means more simultaneous function invocations, each opening a Neon connection. At 100 users polling every 30s with 2 tabs each = ~13 req/s. If a cold-start burst creates 50 simultaneous invocations, each needing a connection, Neon free tier (10 connections) is exhausted.

**Why it happens:** The HTTP driver mitigates persistent connection leaks, but does not prevent connection count spikes from burst invocations.

**Consequences:** `NeonDbError: too many connections` — the entire app returns 500s until connections drain.

**Prevention:**
1. Notification count endpoint must be extremely fast (single indexed query on `notifications WHERE org_id = ? AND read = false`). Index `(organizationId, readAt)`.
2. Add a short-lived in-memory cache on the notification count per `organizationId` (e.g., 10s TTL) — avoids hitting DB on every poll from every tab of every user in the same org.
3. Use Neon's pooler endpoint (`-pooler.neon.tech`) for all DB connections — this is the standard Vercel + Neon setup and handles connection multiplexing.
4. Confirm `DATABASE_URL` in production points to the `-pooler` hostname, not the direct hostname.

**Detection:** `vercel env ls production` — check `DATABASE_URL` hostname contains `-pooler`.

**Phase:** In-app notifications phase.

**Security:** None — availability risk.

---

## Moderate Pitfalls

---

### Pitfall 20: Self-Service Billing — Double Checkout if User Clicks Twice

**What goes wrong:** `/api/billing/checkout` creates an Asaas checkout session. If the user double-clicks the "Assinar" button before the redirect, two requests hit the endpoint. With the current in-memory rate limiter at 5 req/min per IP, both requests pass (they are sequential within the same window). Two Asaas customers or two subscriptions may be created for the same org.

**Prevention:**
1. Add idempotency on checkout creation: check `organizations.asaasCustomerId IS NOT NULL` before creating a new Asaas customer. If it exists, return the existing customer's checkout link.
2. Disable the checkout button client-side immediately on first click (optimistic disable).
3. The 5 req/min billing rate limiter in proxy.ts is already in place — reinforce with button-level debounce.

**Phase:** Self-service billing phase.

---

### Pitfall 21: Asaas PAYMENT_DELETED Fires When Boleto Expires — Org Incorrectly Canceled

**What goes wrong:** The current `mapAsaasEvent` maps `PAYMENT_DELETED` to `{ subscriptionStatus: "canceled" }`. Asaas fires `PAYMENT_DELETED` when an individual boleto charge expires (not just when a subscription is deleted). An org that generated a boleto but did not pay — and whose boleto expired — would be marked `canceled` when only one unpaid charge was deleted, not the whole subscription.

**Prevention:**
1. Only set `canceled` on `SUBSCRIPTION_DELETED`, not on `PAYMENT_DELETED`.
2. For `PAYMENT_DELETED`: check `payload.payment.subscription` — if this was a standalone charge (no subscription), ignore or map to a less severe status.
3. Alternatively: map `PAYMENT_DELETED` to `past_due` rather than `canceled`, and only escalate to `canceled` on explicit `SUBSCRIPTION_DELETED`.

**Detection:** Create a boleto in Asaas sandbox, let it expire — check what event fires and what `subscriptionStatus` becomes.

**Phase:** Self-service billing phase. Also a retrofit to the existing webhook handler.

**Security:** None — data correctness risk.

---

### Pitfall 22: WhatsApp Phone Number Cannot Be Migrated After Registration

**What goes wrong:** Once a phone number is registered on WhatsApp Cloud API, it cannot also be used on the WhatsApp Business App. Pruma needs a dedicated number for the WABA. If the development team tests with a personal or shared number, that number is permanently bound to the API and cannot revert to normal WhatsApp use.

**Prevention:** Procure a dedicated virtual number (VoIP or eSIM) exclusively for Pruma's WABA. Do not use any team member's personal number.

**Phase:** WhatsApp notification phase (procurement, not coding).

---

### Pitfall 23: SLA Cron Runs Concurrently — Double Auto-Rejection

**What goes wrong:** Vercel does not guarantee single-instance cron execution. If the SLA expiry cron takes longer than its interval (which won't happen on free tier's daily run, but is relevant if GitHub Actions fires it every 15min), two instances may run simultaneously, each finding the same expired approvals and both auto-rejecting them, triggering duplicate n8n callbacks.

**Prevention:**
1. Make the auto-rejection query idempotent: `UPDATE approvals SET status = 'auto_rejected' WHERE status = 'pending' AND expiresAt < now()`. Only rows currently `pending` are affected — a second run finds 0 rows.
2. The n8n callback fire (after auto-rejection) must check if the approval is now `auto_rejected` before sending — prevents double callbacks.
3. Add a `rejectedAt` timestamp — if already set, skip.

**Phase:** SLA/deadline phase.

---

### Pitfall 24: Missing `past_due` Handling in Subscription Guard

**What goes wrong:** The current proxy.ts `BLOCKED_STATUSES` set contains `["canceled", "inactive"]` but not `"past_due"`. An org with an overdue payment retains full dashboard access. This may be intentional (grace period), but if it is unintentional, it's a billing gap.

**Prevention:**
1. Define explicit policy: is `past_due` a grace-period state (access retained for N days) or an immediate-block state?
2. If grace period: add a UI banner on all dashboard pages when `subscriptionStatus === "past_due"` prompting payment — do not silently allow access.
3. If immediate block: add `"past_due"` to `BLOCKED_STATUSES`.
4. Document the decision in `apps/web/src/app/CLAUDE.md` as a product rule.

**Phase:** Self-service billing phase.

---

### Pitfall 25: LGPD Debt Blocks WhatsApp Opt-In — No Legal Basis Without DPA/Privacy Policy Completion

**What goes wrong:** Sending WhatsApp messages requires LGPD-compliant opt-in: the privacy policy must describe WhatsApp as a communication channel, and the DPA (for B2B) must cover it. The existing LGPD placeholders (CNPJ, address, DPO, mailbox) are pending. Launching WhatsApp notifications without completing these creates legal exposure for Brazilian law (LGPD Art. 7 requires legitimate basis for personal data processing, including phone numbers).

**Prevention:**
1. Complete LGPD placeholder items (see `project_lgpd_debt.md` in memory) before shipping WhatsApp opt-in.
2. Add explicit consent language at the point where a user enters their phone number: "Ao informar seu telefone, você concorda em receber notificações de aprovação via WhatsApp."
3. Store consent timestamp and version in the user record.

**Phase:** OTP phone verification phase (prerequisite to WhatsApp).

---

## Minor Pitfalls

---

### Pitfall 26: TOTP Clock Skew — Google Authenticator vs Server Time Drift

**What goes wrong:** TOTP is time-based (30-second windows). If a user's phone clock drifts more than 30 seconds from the server, valid codes appear invalid.

**Prevention:** Allow ±1 time step tolerance in the TOTP verification library (e.g., `otplib`'s `window: 1`). Do not increase beyond ±2 steps (60 seconds) — that widens the replay window unnecessarily.

**Phase:** 2FA TOTP phase.

---

### Pitfall 27: Notification Bell Counter Goes Out of Sync After Bulk Approvals

**What goes wrong:** If a user resolves multiple approvals in quick succession, the badge counter (fetched via polling) may show stale counts until the next poll cycle. The counter can also drift if an approval is resolved by another session (another team member) — the current user's counter doesn't update.

**Prevention:** On every approve/reject action (client-side), immediately decrement the pending counter optimistically. On the next poll cycle, the server value reconciles. Use a `key` or `mutate()` pattern in SWR/React Query to force revalidation after mutations.

**Phase:** In-app notifications phase.

---

### Pitfall 28: WhatsApp Template Variable Length Limits

**What goes wrong:** WhatsApp template body variables have a 1024-character limit for the full body. If `flowName` or `approvalTitle` (interpolated into the template) is long, the message may be silently truncated or rejected during send.

**Prevention:** Truncate template variable values server-side before sending: `flowName.substring(0, 80)`. Add this as a utility function in the WhatsApp sending module.

**Phase:** WhatsApp notification phase.

---

## Phase-Specific Warnings Summary

| Phase Topic | Primary Pitfall | Mitigation |
|---|---|---|
| OTP email/phone verification | Brute-force (P10), plaintext storage (P9), in-memory rate limiter ineffective (P18) | bcrypt + DB-backed attempt counter + Upstash Redis rate limit |
| WhatsApp notification | WABA registration timeline (P3), template rejection (P4), quality rating (P6) | Start WABA 3+ weeks early; utility-only templates; opt-in tracking |
| WhatsApp JWT links | Cross-tenant approval (P7), replay (P8) | orgId in JWT + jti used-tokens table |
| In-app notifications | SSE timeout (P14), polling storm (P15), Neon exhaustion (P19) | DB polling + BroadcastChannel + pooler endpoint |
| Self-service billing | Webhook idempotency (P1), stale JWT status (P2), double checkout (P20), PAYMENT_DELETED mapping (P21) | Processed-events table + proxy DB re-check + idempotent checkout |
| SLA auto-reject | Cron reliability (P16), timezone (P17), duplicate execution (P23) | Lazy expiry on read + GitHub Actions 15min + UTC-aware input |
| 2FA TOTP | Plaintext secret (P11), replay (P12), no recovery (P13), clock skew (P26) | AES-256-GCM secret + jti tracking + backup codes |
| All phases | LGPD incomplete (P25), past_due grace period undefined (P24) | Complete LGPD before WhatsApp; document past_due policy |

---

## Sources

- Asaas webhook idempotency: https://docs.asaas.com/docs/how-to-implement-idempotence-in-webhooks (HIGH confidence — official docs)
- Asaas subscription events: https://docs.asaas.com/docs/subscription-events (HIGH confidence — official docs)
- Meta WhatsApp template rejection: https://www.fyno.io/blog/why-is-meta-rejecting-my-whatsapp-business-templates-cm2efjq2s0057m1jlzfh7olqz (MEDIUM)
- Meta WhatsApp messaging limits: https://developers.facebook.com/docs/whatsapp/messaging-limits/ (HIGH confidence — official docs)
- Meta WABA registration: https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/phone-numbers (HIGH confidence — official docs)
- Vercel SSE timeout: https://community.vercel.com/t/sse-time-limits/5954 (MEDIUM — community verified)
- Vercel cron reliability: https://vercel.com/docs/cron-jobs (HIGH confidence — official docs)
- Vercel cron missed invocations: https://posthook.io/compare/vercel-cron-vs-posthook (MEDIUM)
- Neon connection pooling Vercel: https://neon.com/docs/guides/vercel-connection-methods (HIGH confidence — official docs)
- TOTP common mistakes: https://www.authgear.com/post/5-common-totp-mistakes (MEDIUM)
- TOTP secret encryption: https://www.sjoerdlangkemper.nl/2023/02/01/should-2fa-secrets-be-encrypted/ (MEDIUM)
- JWT security pitfalls: https://portswigger.net/web-security/jwt (HIGH confidence — authoritative security source)
- OTP security Next.js: https://clerk.com/blog/otp-authentication-nextjs (MEDIUM)
- WhatsApp 24h window: https://help.activecampaign.com/hc/en-us/articles/20679458055964-Understanding-the-24-hour-conversation-window-in-WhatsApp-messaging (MEDIUM)
- NextAuth JWT staleness: https://next-auth.js.org/faq (HIGH confidence — official docs)
- In-app notifications Vercel patterns: https://upstash.com/blog/realtime-notifications (MEDIUM)
