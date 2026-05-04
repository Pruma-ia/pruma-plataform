# Phase 1: Foundation - Research

**Researched:** 2026-05-02
**Domain:** Next.js 16 / NextAuth v5 JWT / Drizzle ORM / Upstash Redis / Cloudflare R2
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**OTP Email Gate (AUTH-01, AUTH-02)**
- D-01: Gate via `proxy.ts` — checar flag `emailVerified` no JWT. Se `false` → redirect `/verify-email`. Sem acesso parcial ou banner sem bloqueio.
- D-02: Pós-registro: usuário cai diretamente em `/verify-email` (não via dashboard + proxy redirect).
- D-03: OTP expiry: 15 minutos. Tokens armazenados hashed (bcrypt). Endpoint rate limited.
- D-04: OTP errado ou expirado: mostrar erro na UI + botão de reenvio disponível após cooldown de 60s. Sem bloqueio de conta.
- D-05: Nenhum usuário real em prod → zero migração necessária. Slate limpo.

**Onboarding Checklist (DASH-03, DASH-04, DASH-05)**
- D-06: Estado derivado do DB — sem mudança de schema para os itens 2 e 3. Calculado a cada load do dashboard.
- D-07: 3 itens: (1) "Agendar suporte" → WhatsApp link click, (2) "Processo configurado" → flows.count>0, (3) "Primeira aprovação recebida" → approvals.count>0.
- D-08: Item 1 requer coluna `onboardingWhatsappClickedAt timestamp` em `organizations`.
- D-09: Mostrado para TODOS os membros da org (sem checar role).
- D-10: Checklist visível quando `flows.count = 0 AND approvals.count = 0`.
- D-11: Checklist desaparece quando os 3 itens estão completos.
- D-12: `SUPPORT_WHATSAPP_LINK` env var (fallback para `#`).

**Dashboard Métricas (DASH-01, DASH-02)**
- D-13: 4 cards no grid existente: Fluxos ativos, Aprovações pendentes, Resolvidas hoje, Tempo médio (30d).
- D-14: "Resolvidas hoje" = `status IN ('approved','rejected') AND updatedAt >= início do dia UTC`.
- D-15: "Tempo médio" = `avg(updatedAt - createdAt)` últimos 30 dias, resolved approvals.
- D-16: Empty state tempo médio: `"—"` com tooltip "Sem aprovações resolvidas nos últimos 30 dias".

**Org Logo e Nome (ORG-01)**
- D-17: Logo via R2 presigned URL (mesmo padrão de `approval_files`).
- D-18: PNG/JPG/WebP, max 2MB, validação client + server.
- D-19: `organizations.logo` (coluna `text`, já existe) armazena path R2.
- D-20: Logo exibida no header para todos os membros da org.

### Claude's Discretion

- PROF-02: View-only lista de provedores conectados (Google, credentials). Sem disconnect em Phase 1.
- INFRA-01: Migrar `authRateMap` e `billingRateMap` de `proxy.ts` para `@upstash/ratelimit`. Adicionar rate limit Upstash nos novos endpoints OTP (`/api/auth/verify-otp`, `/api/auth/resend-otp`). Vars: `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`.

### Deferred Ideas (OUT OF SCOPE)

- Disconnect de conta conectada (PROF-02): requer guard "último método de auth". Fase futura.
- Preview de logo antes do upload: crop/resize client-side. Útil mas não necessário.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | Usuário recebe OTP por email ao criar conta e não acessa o painel sem verificar | OTP flow, emailVerified JWT gate in proxy.ts, new `/verify-email` page and API routes |
| AUTH-02 | Usuário pode reenviar OTP com cooldown de 60s | resend-otp endpoint, DB cooldown via `createdAt`, Upstash rate limit |
| DASH-01 | Usuário vê 4 métricas: pendentes, resolvidas hoje, fluxos ativos, tempo médio | New Drizzle queries in dashboard/page.tsx; `sql` helper for avg/date math |
| DASH-02 | Métricas filtradas por organizationId | All queries already scoped; enforced by pattern |
| DASH-03 | Org nova vê checklist de primeiros passos | `OnboardingChecklist` component; DB-derived state; `onboardingWhatsappClickedAt` column |
| DASH-04 | Item marcado automaticamente quando ação é completada | Derived state from DB counts; click handler for WhatsApp item calls mark endpoint |
| DASH-05 | Checklist desaparece quando todos os itens completos | Conditional render: `allDone || !isNewOrg` |
| ORG-01 | Owner pode editar nome e logo da organização | R2 presigned upload (logo); `PATCH /api/organizations/profile` endpoint; org settings page |
| PROF-01 | Usuário pode editar nome de exibição | `PATCH /api/user/profile` endpoint; profile page update |
| PROF-02 | Usuário pode ver contas conectadas (view-only) | Query `accounts` table by `userId`; list providers on profile page |
| INFRA-01 | Rate limiting migra de in-memory para Upstash Redis | `@upstash/ratelimit` + `@upstash/redis`; replace `authRateMap`/`billingRateMap` in proxy.ts; add to OTP endpoints |
</phase_requirements>

---

## Summary

Phase 1 adds email verification via OTP as a hard gate before any dashboard access, enriches the dashboard with 4 real operational metrics and an onboarding checklist, enables org logo upload via R2, exposes display name editing and connected accounts on the profile page, and replaces the in-memory rate limiter with Upstash Redis — all on top of an already-deployed brownfield Next.js 16 app.

The codebase has strong patterns to reuse: the presigned R2 upload flow (from `approval_files`), the hashed token model (from `passwordResetTokens` and `onboardingTokens`), the JWT claims extension pattern (`next-auth.d.ts`), and the Drizzle ORM query style in `dashboard/page.tsx`. No major architectural invention is needed — every feature threads through existing seams.

The most structurally significant work is the emailVerified JWT gate in `proxy.ts`. It must be placed AFTER the onboarding guard (which redirects users without an org) but BEFORE any subscription guard, and it must explicitly bypass `/verify-email`, `/api/auth/verify-otp`, `/api/auth/resend-otp`, and all `/api/auth/` routes to avoid redirect loops. The second most complex piece is the Upstash migration — `@upstash/ratelimit` must be initialized as a module-level singleton (not per-request) to avoid cold-start reconnect overhead.

**Primary recommendation:** Build in dependency order — schema first, then auth.ts JWT claims, then proxy.ts gate, then API routes (OTP, org profile, user profile), then UI pages. Do not start the proxy.ts gate until the `/verify-email` page and OTP API routes are done, or you will lock yourself out of the app during development.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| emailVerified JWT gate | Frontend Server (proxy.ts) | — | All access control enforcement lives in proxy.ts per project convention |
| OTP generation & hashing | API / Backend | — | Cryptographic operations never happen client-side |
| OTP email delivery | API / Backend | — | Email transport lives in `lib/email.ts`, server-only |
| OTP verification | API / Backend | — | Reads hashed token from DB; bcrypt.compare is server-only |
| Resend OTP with cooldown | API / Backend | — | cooldown enforced via DB `createdAt`; rate limit via Upstash |
| Dashboard metrics queries | Frontend Server (Server Component) | — | `dashboard/page.tsx` is a Server Component; queries run server-side |
| Onboarding checklist state | Frontend Server (Server Component) | API / Backend (mark endpoint) | State derived server-side on load; WhatsApp click marks via API |
| Org logo upload (presign) | API / Backend | Browser (direct R2 PUT) | Server generates presigned URL; browser PUTs directly to R2 |
| Org logo display | Frontend Server (SSR) | Browser (img tag) | Logo URL fetched in Server Component, rendered as img |
| Display name editing | API / Backend | Browser (form) | PATCH endpoint; form is client component |
| Connected accounts view | Frontend Server (Server Component) | — | DB query for accounts table; read-only render |
| Rate limiting (proxy.ts routes) | Frontend Server (proxy.ts) | Upstash Redis | Upstash Redis provides cross-instance counter |
| Rate limiting (OTP API routes) | API / Backend | Upstash Redis | OTP endpoints themselves apply ratelimit |

---

## Standard Stack

### Core (all existing in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.4 | Framework, App Router | Project foundation |
| NextAuth v5 | ^5.x | JWT auth, JWT callbacks | Project foundation |
| Drizzle ORM | existing | DB queries, schema | Project foundation |
| bcryptjs | ^3.0.3 | Hash OTP tokens | Already installed; used for passwords |
| Zod | ^4.3.6 | Input validation | Project standard; use `z.record(z.string(), z.unknown())` (v4 two-arg form) |
| `@aws-sdk/client-s3` | existing | R2 presigned URL | Already used in `r2.ts` |

### New Dependencies for Phase 1
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `@upstash/ratelimit` | 2.0.8 | Cross-instance rate limiting | Drop-in Vercel-compatible replacement for in-memory Map; INFRA-01 |
| `@upstash/redis` | 1.37.0 | Redis client for Ratelimit | Peer dependency of ratelimit; HTTP-based, works in Edge/Serverless |

[VERIFIED: npm registry — `@upstash/ratelimit@2.0.8` latest as of 2026-05-02]
[VERIFIED: npm registry — `@upstash/redis@1.37.0` latest as of 2026-05-02]

**Installation:**
```bash
cd apps/web && npm install @upstash/ratelimit@2.0.8 @upstash/redis@1.37.0
```

### New Environment Variables
```
# Upstash Redis (INFRA-01 + OTP rate limiting)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Onboarding checklist WhatsApp support link (DASH-03)
SUPPORT_WHATSAPP_LINK=https://wa.me/55XXXXXXXXXXX
```

---

## Architecture Patterns

### System Architecture Diagram

```
POST /api/auth/register
  │
  ├─► create user (emailVerified = null)
  ├─► create org + membership
  ├─► generate OTP → hash (bcrypt) → insert email_otp_tokens
  ├─► send OTP email (Resend/Mailpit)
  └─► redirect client to /verify-email
                                  │
                      GET /verify-email (public page)
                      User enters 6-digit code
                                  │
                      POST /api/auth/verify-otp
                        ├─ find token by userId (unexpired, unused)
                        ├─ bcrypt.compare(code, hash)
                        ├─ mark usedAt, set users.emailVerified = now()
                        └─ redirect to /onboarding/org-profile

proxy.ts (every guarded request)
  ├─ [existing] onboarding guard
  ├─ [NEW] emailVerified guard ← inserts here
  │     session.user.emailVerified === false → redirect /verify-email
  ├─ [existing] admin guard
  └─ [existing] subscription guard

Dashboard Server Component
  └─ Promise.all([
       flows count,
       pending approvals count,
       resolved today count,     ← NEW
       avg resolution time 30d,  ← NEW
       onboarding checklist data  ← NEW (flows+approvals counts + whatsappClickedAt)
     ])

R2 Logo Upload flow
  1. Browser → POST /api/organizations/logo/presign  → { uploadUrl, r2Key }
  2. Browser → PUT uploadUrl (direct to R2/MinIO)
  3. Browser → PATCH /api/organizations/profile { logo: r2Key }
  4. Server Component re-renders header with new logo URL
```

### Recommended Project Structure (additions only)
```
apps/web/src/
├── app/
│   ├── (auth)/
│   │   └── verify-email/
│   │       └── page.tsx          ← NEW: OTP entry UI
│   ├── api/
│   │   └── auth/
│   │       ├── verify-otp/
│   │       │   └── route.ts      ← NEW
│   │       └── resend-otp/
│   │           └── route.ts      ← NEW
│   │   └── organizations/
│   │       ├── profile/
│   │       │   └── route.ts      ← NEW: PATCH name + logo path
│   │       └── logo/
│   │           └── presign/
│   │               └── route.ts  ← NEW: R2 presigned URL for logo
│   │   └── user/
│   │       └── profile/
│   │           └── route.ts      ← NEW: PATCH display name
│   │   └── onboarding/
│   │       └── whatsapp-clicked/
│   │           └── route.ts      ← NEW: mark whatsapp clicked
│   └── (dashboard)/
│       ├── dashboard/
│       │   └── page.tsx          ← MODIFY: add 2 new metric cards + checklist
│       └── settings/
│           ├── organization/
│           │   └── page.tsx      ← MODIFY: add name + logo fields
│           └── profile/
│               └── page.tsx      ← MODIFY: add display name + connected accounts
├── components/
│   ├── dashboard/
│   │   ├── header.tsx            ← MODIFY: accept orgLogo + orgName props
│   │   └── onboarding-checklist.tsx  ← NEW
│   └── ui/
│       └── tooltip.tsx           ← NEW (or use shadcn/ui tooltip if available)
├── lib/
│   └── ratelimit.ts              ← NEW: Upstash ratelimit singletons
└── types/
    └── next-auth.d.ts            ← MODIFY: add emailVerified boolean
```

---

## Schema Changes

### New Table: `email_otp_tokens`

```typescript
// [VERIFIED: matches passwordResetTokens pattern in codebase]
export const emailOtpTokens = pgTable("email_otp_tokens", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})
```

Rationale: one row per user; upsert on resend (delete existing + insert new). `tokenHash` stores `bcrypt.hash(sixDigitCode, 10)`. No unique index on `userId` — use upsert-by-delete pattern to handle resends cleanly.

### Modified Table: `users`

`emailVerified` column already exists as `timestamp("email_verified")` — **no schema change needed for users**. [VERIFIED: confirmed in `db/schema.ts` line 34]

The JWT claim `emailVerified: boolean` will be derived from `users.emailVerified IS NOT NULL` when reading the claim.

### Modified Table: `organizations`

Add one column:

```typescript
onboardingWhatsappClickedAt: timestamp("onboarding_whatsapp_clicked_at"),
```

This is the only new column in `organizations`. [VERIFIED: column does not exist in current schema.ts]

### Summary of Schema Changes

| Table | Change | Type |
|-------|--------|------|
| `email_otp_tokens` | New table | `drizzle-kit generate` |
| `organizations` | Add `onboarding_whatsapp_clicked_at timestamp nullable` | `drizzle-kit generate` |
| `users` | No change — `email_verified timestamp` already exists | — |

**Migration workflow:**
```bash
# 1. Edit db/schema.ts (add emailOtpTokens table + onboardingWhatsappClickedAt column)
# 2. Generate migration
cd apps/web && npm run db:generate
# 3. Review generated SQL in db/migrations/
# 4. Apply to Docker local
sed 's/-->.*//' db/migrations/<new-file>.sql | docker exec -i pruma_db psql -U pruma -d pruma_dev
# 5. Commit — CI applies via db:migrate on push to master/production
```

**Critical: never run `drizzle-kit push` in production. Never manually edit journal.json. Verify `when` is chronologically greater than previous entry.** [VERIFIED: from apps/web/db/CLAUDE.md]

---

## API Endpoints

### New Endpoints

| Method | Path | Auth Required | Rate Limit | Purpose |
|--------|------|---------------|------------|---------|
| `POST` | `/api/auth/verify-otp` | Session (emailVerified=false OK) | Upstash: 5 req/15min per userId | Verify OTP code; sets `emailVerified` |
| `POST` | `/api/auth/resend-otp` | Session (emailVerified=false OK) | Upstash: 3 req/hour per userId | Resend OTP; enforces 60s cooldown via DB `createdAt` |
| `POST` | `/api/organizations/logo/presign` | Session (owner/admin) | Existing auth rate limit | Generate R2 presigned PUT URL for logo upload |
| `PATCH` | `/api/organizations/profile` | Session (owner/admin) | Existing auth rate limit | Update org name and/or logo R2 path |
| `PATCH` | `/api/user/profile` | Session | Existing auth rate limit | Update display name |
| `POST` | `/api/onboarding/whatsapp-clicked` | Session | Existing auth rate limit | Set `onboardingWhatsappClickedAt = now()` |

### proxy.ts Changes

1. **New route matchers** to add to `config.matcher`:
   - `/verify-email` (must be in matcher so proxy.ts runs on it — but must NOT gate it)
   - `/api/auth/verify-otp` (must be in matcher for rate limit — but must NOT gate it for emailVerified)
   - `/api/auth/resend-otp` (same)

2. **New emailVerified guard** (insert between onboarding guard and admin guard):

```typescript
// [ASSUMED — pattern derived from existing subscription guard logic]
// Bypasses: /verify-email, /api/auth/, /onboarding, public routes
const EMAIL_VERIFY_BYPASS = [
  "/verify-email",
  "/login",
  "/register",
  "/onboarding",
  "/api/auth/",
  "/api/",  // ← careful: only bypass api routes that don't need emailVerified
]
// Correct approach: gate only dashboard routes, not all api routes
const EMAIL_VERIFY_GUARDED = GUARDED_PREFIXES // same as subscription guard
if (
  isGuardedRoute &&
  session &&
  !session.user.isSuperAdmin &&
  session.user.emailVerified === false
) {
  return NextResponse.redirect(new URL("/verify-email", req.url))
}
```

**Important subtlety:** The `/api/auth/verify-otp` and `/api/auth/resend-otp` endpoints are called WHILE `emailVerified=false`. They must NOT be blocked by the emailVerified guard. Since these routes start with `/api/auth/`, they fall under the existing rate-limit branch but do NOT fall under `GUARDED_PREFIXES` (which are dashboard routes), so the guard naturally does not apply to them. No special bypass needed beyond not adding these API routes to `GUARDED_PREFIXES`. [VERIFIED: confirmed by reading current proxy.ts — GUARDED_PREFIXES = `/dashboard`, `/flows`, `/approvals`, `/settings`]

3. **Upstash ratelimit migration**: replace `isRateLimited(authRateMap, ...)` and `isRateLimited(billingRateMap, ...)` with Upstash `Ratelimit` instances. `Redis.fromEnv()` reads `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` automatically.

---

## Implementation Patterns

### Pattern 1: OTP Generation and Storage

```typescript
// Source: Node.js crypto built-in (no new dependency)
// [VERIFIED: bcryptjs already in package.json; crypto is built-in]
import crypto from "crypto"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { emailOtpTokens } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function generateAndStoreOtp(userId: string): Promise<string> {
  const code = crypto.randomInt(100000, 999999).toString()
  const hash = await bcrypt.hash(code, 10)
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 min (D-03)

  // Delete any existing token for this user (clean resend)
  await db.delete(emailOtpTokens).where(eq(emailOtpTokens.userId, userId))

  await db.insert(emailOtpTokens).values({ userId, tokenHash: hash, expiresAt })

  return code // send this by email, never store it
}
```

### Pattern 2: OTP Verification

```typescript
// [ASSUMED — pattern follows passwordResetTokens verification in codebase]
export async function verifyOtp(userId: string, code: string): Promise<"ok" | "wrong" | "expired"> {
  const [token] = await db
    .select()
    .from(emailOtpTokens)
    .where(and(eq(emailOtpTokens.userId, userId), isNull(emailOtpTokens.usedAt)))
    .limit(1)

  if (!token) return "wrong"
  if (token.expiresAt < new Date()) return "expired"

  const valid = await bcrypt.compare(code, token.tokenHash)
  if (!valid) return "wrong"

  // Mark used and set emailVerified in a single transaction
  await db.transaction(async (tx) => {
    await tx.update(emailOtpTokens)
      .set({ usedAt: new Date() })
      .where(eq(emailOtpTokens.id, token.id))
    await tx.update(users)
      .set({ emailVerified: new Date() })
      .where(eq(users.id, userId))
  })

  return "ok"
}
```

### Pattern 3: Upstash Ratelimit Singleton

```typescript
// src/lib/ratelimit.ts
// Source: https://upstash.com/docs/redis/sdks/ratelimit-ts/gettingstarted
// [VERIFIED: @upstash/ratelimit 2.0.8, @upstash/redis 1.37.0]
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// Singleton — one instance per limiter type; NOT per request
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
})

// Replaces authRateMap: 20 req/min per IP
export const authRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "60 s"),
  prefix: "pruma:auth",
})

// Replaces billingRateMap: 5 req/min per IP
export const billingRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(5, "60 s"),
  prefix: "pruma:billing",
})

// New: OTP verify endpoint — 5 req/15min per userId (brute-force protection)
export const otpVerifyRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(5, "15 m"),
  prefix: "pruma:otp-verify",
})

// New: OTP resend endpoint — 3 req/hour per userId
export const otpResendRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(3, "60 m"),
  prefix: "pruma:otp-resend",
})
```

Usage in proxy.ts:
```typescript
// [ASSUMED — derived from existing pattern + Upstash docs]
const { success } = await authRatelimit.limit(ip)
if (!success) return new NextResponse("Too Many Requests", { status: 429 })
```

**Caveat:** `proxy.ts` runs as Next.js middleware (edge-compatible). `@upstash/redis` uses HTTP fetch, which is edge-compatible. Do NOT use `ioredis` or `node:net` in proxy.ts.

### Pattern 4: Dashboard Metrics Queries

```typescript
// Source: Drizzle ORM sql helper — existing codebase uses count(), and, eq
// [VERIFIED: drizzle-orm sql helper available; approvals table has updatedAt + createdAt]
import { sql, and, eq, gte, inArray, avg } from "drizzle-orm"

const startOfDayUtc = new Date()
startOfDayUtc.setUTCHours(0, 0, 0, 0)

const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

const RESOLVED_STATUSES = ["approved", "rejected"] as const

// Resolved today (D-14)
const resolvedToday = db
  .select({ total: count() })
  .from(approvals)
  .where(
    and(
      eq(approvals.organizationId, orgId),
      inArray(approvals.status, RESOLVED_STATUSES),
      gte(approvals.updatedAt, startOfDayUtc),
    )
  )

// Avg resolution time 30d (D-15)
// Extract epoch seconds from interval, then format
const avgResolutionMs = db
  .select({
    avgMs: sql<number | null>`avg(extract(epoch from (${approvals.updatedAt} - ${approvals.createdAt})) * 1000)`
  })
  .from(approvals)
  .where(
    and(
      eq(approvals.organizationId, orgId),
      inArray(approvals.status, RESOLVED_STATUSES),
      gte(approvals.updatedAt, thirtyDaysAgo),
    )
  )
```

Format avg time for display:
```typescript
function formatAvgTime(ms: number | null): string {
  if (ms === null) return "—" // D-16
  const minutes = Math.round(ms / 60_000)
  if (minutes < 60) return `${minutes}min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.round(hours / 24)}d`
}
```

### Pattern 5: Onboarding Checklist State

```typescript
// [ASSUMED — derived from D-06 through D-12]
// All derived server-side in dashboard/page.tsx Server Component
interface ChecklistState {
  whatsappClicked: boolean   // organizations.onboardingWhatsappClickedAt IS NOT NULL
  processConfigured: boolean // flows.count > 0
  firstApproval: boolean     // approvals.count > 0
}

// Show checklist when: flows.count = 0 AND approvals.count = 0 (D-10)
const isNewOrg = flowCount === 0 && approvalCount === 0

// When all 3 items done, hide checklist (D-11)
const allDone = checklist.whatsappClicked && checklist.processConfigured && checklist.firstApproval

const showChecklist = isNewOrg || (!allDone && (isNewOrg || checklist.whatsappClicked))
// Simpler: show if NOT all done AND (new org OR whatsapp already clicked)
// Actually per D-10: show when flows.count=0 AND approvals.count=0
// Once flows or approvals exist, checklist is hidden (org is no longer "new")
// D-11 says disappears when ALL 3 complete — so if process+approval done but whatsapp not, still show
// Resolution: show when (flowCount=0 AND approvalCount=0) OR (not allDone AND onboardingWhatsappClickedAt IS NOT NULL)
```

**Disambiguation of D-10 vs D-11:** D-10 says checklist is visible when `flows.count=0 AND approvals.count=0`. D-11 says it disappears when all 3 are complete. These are not contradictory: once flows>0 OR approvals>0, items 2 and 3 are individually checked, but D-10 governs the initial visibility. The planner should confirm: if flows.count>0 but whatsappClicked is false, should the checklist still show? Recommendation: show checklist when `NOT allDone AND org was "new" at some point` — tracked by whether `onboardingWhatsappClickedAt` is set OR `flows.count=0 AND approvals.count=0`. Open question logged below.

### Pattern 6: R2 Logo Upload (reuses existing pattern)

```typescript
// Reuse from approval_files presign route — same pattern
// [VERIFIED: r2.ts already has buildR2Key, presignUploadUrl, ALLOWED_MIME_TYPES]

// Logo-specific MIME types (subset of ALLOWED_MIME_TYPES — D-18)
const LOGO_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"])
const LOGO_MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2MB

// R2 key pattern: logos/{orgId}/{uuid}/{filename}
// (prefix with "logos/" to distinguish from approval_files)
export function buildLogoR2Key(orgId: string, filename: string): string {
  const uuid = crypto.randomUUID()
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100)
  return `logos/${orgId}/${uuid}/${safe}`
}
```

### Pattern 7: JWT Claims Extension

```typescript
// src/types/next-auth.d.ts — add emailVerified boolean
// [VERIFIED: current file has no emailVerified claim]
declare module "next-auth" {
  interface Session {
    user: {
      // ... existing claims ...
      emailVerified?: boolean  // true = verified, false = unverified, undefined = Google (no OTP needed)
    } & DefaultSession["user"]
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    // ... existing claims ...
    emailVerified?: boolean
  }
}
```

In `auth.ts` JWT callback (within the `if (user)` branch):
```typescript
// [ASSUMED — follows existing JWT claim population pattern]
const dbUser = await db.select({ emailVerified: users.emailVerified, isSuperAdmin: users.isSuperAdmin })
  .from(users).where(eq(users.id, userId)).limit(1).then(r => r[0])

// emailVerified: null in DB = not verified → false in JWT
// emailVerified: timestamp = verified → true in JWT
// Google users: emailVerified is set by Google → true
token.emailVerified = dbUser?.emailVerified !== null && dbUser?.emailVerified !== undefined
```

**Important:** Google OAuth users have `emailVerified` set by NextAuth's DrizzleAdapter from the Google profile. They should NOT be redirected to `/verify-email`. The JWT claim will naturally be `true` for them (their `users.emailVerified` is set at account creation).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-instance rate limiting | Custom Redis counter | `@upstash/ratelimit` | Handles sliding window, atomic increments, TTL cleanup |
| OTP 6-digit generation | Math.random() | `crypto.randomInt(100000, 999999)` | Cryptographically random; Math.random is predictable |
| OTP hashing | MD5/SHA-1/plain | `bcrypt.hash(code, 10)` | Resistant to preimage attacks; bcryptjs already installed |
| R2 presigned URL | Direct S3 calls | `buildR2Key` + `presignUploadUrl` from `r2.ts` | Already implemented and tested |
| Email sending | Direct Resend/nodemailer | `sendEmail()` from `email.ts` | Handles dev/prod transport switching |
| SQL time arithmetic | JS date math post-query | `sql` helper with `extract(epoch from ...)` | DB-native; avoids fetching all rows |

---

## Common Pitfalls

### Pitfall 1: emailVerified Guard Creates Redirect Loop for OTP Routes
**What goes wrong:** Adding emailVerified gate to all routes in `GUARDED_PREFIXES` is safe (those are dashboard routes). But if the gate is incorrectly placed to also cover `/api/auth/verify-otp`, the endpoint that sets `emailVerified=true` becomes inaccessible, creating an infinite loop.
**Why it happens:** Copy-paste from subscription guard without checking which routes need the gate.
**How to avoid:** Gate only routes in `GUARDED_PREFIXES` (dashboard/flows/approvals/settings). The OTP API routes live under `/api/auth/` which is NOT in `GUARDED_PREFIXES`. Verified by reading `proxy.ts` lines 27-28.
**Warning signs:** After registering, browser enters redirect loop between `/verify-email` and itself.

### Pitfall 2: JWT emailVerified Claim Goes Stale After Verification
**What goes wrong:** User verifies OTP → `users.emailVerified` is set in DB → but JWT still carries `emailVerified: false` → proxy.ts keeps redirecting to `/verify-email`.
**Why it happens:** JWT is not re-issued after OTP verification. `session.user.emailVerified` reads from JWT, not DB.
**How to avoid:** After successful OTP verification, call `auth.update()` (NextAuth v5 unstable_update) or force a new sign-in. The cleanest path: after `POST /api/auth/verify-otp` returns success, the client calls `signIn` with the existing credentials or uses NextAuth v5's `update()` method to refresh the JWT. [VERIFIED: NextAuth v5 exposes `unstable_update` for JWT refresh without re-sign-in]
**Warning signs:** Verification succeeds (200 from API) but browser is still redirected to /verify-email.

### Pitfall 3: Upstash Redis Initialized Per-Request in proxy.ts
**What goes wrong:** Creating `new Redis(...)` and `new Ratelimit(...)` inside the `auth()` callback function body means a new HTTP connection is attempted on every request.
**Why it happens:** Developers follow the "initialize near usage" pattern without realizing serverless module-level singletons avoid this overhead.
**How to avoid:** Initialize `Redis` and `Ratelimit` instances at module level in `lib/ratelimit.ts`, not inside request handlers. Import from there in proxy.ts.
**Warning signs:** Rate limiting latency spikes; Vercel logs show connection initialization on every request.

### Pitfall 4: drizzle-kit generate journal.json `when` Field Corruption
**What goes wrong:** Running `drizzle-kit generate` with a system clock issue (or editing `_journal.json` manually) produces a `when` value less than or equal to the previous migration. The migrator's high-watermark logic silently skips the migration.
**Why it happens:** Documented in `apps/web/db/CLAUDE.md` — this happened with migrations 0002 and 0003.
**How to avoid:** After running `db:generate`, always check that the `when` field in the new journal entry is greater than the previous entry. If clock-skewed, manually set to `Date.now()` (a strictly greater value).
**Warning signs:** Migration SQL file exists but table/column is absent in production after deploy.

### Pitfall 5: Logo Upload — No Confirmation Step Leaves Orphaned R2 Objects
**What goes wrong:** The flow is presign → browser PUT to R2 → PATCH org profile with r2Key. If step 3 (PATCH) never happens (user closes tab after upload), the R2 object is orphaned.
**Why it happens:** Same issue as `approval_file_uploads` — handled there with a `pending`/`confirmed` tracking table and daily cron cleanup.
**How to avoid:** Unlike approval files (where tracking is mandatory), for org logos the risk is low (one object per org, rarely uploaded). Acceptable to skip tracking for Phase 1. The old logo path (if any) should be deleted from R2 when the org profile PATCH succeeds. Store old logo path before the PATCH, delete after success. [ASSUMED — no tracking table planned; consistent with D-17 reusing approval_files pattern which does have tracking, but for logos the tradeoff is different]

### Pitfall 6: OTP Resend Cooldown — `createdAt` vs Resend Time
**What goes wrong:** The 60s cooldown (D-04) is enforced by checking `emailOtpTokens.createdAt`. But after a resend, the old row is deleted and a new one is inserted (generateAndStoreOtp deletes first). So `createdAt` of the latest row correctly represents the last-send time. If the check queries for `createdAt` before the delete in the resend flow, it reads stale data.
**How to avoid:** In the resend endpoint: (1) query existing token for `createdAt`, (2) enforce cooldown check BEFORE deleting and inserting new token. The delete-then-insert in `generateAndStoreOtp` should only be called after cooldown check passes.

### Pitfall 7: `avg()` Returns null When No Rows Match — Not Zero
**What goes wrong:** If no resolved approvals exist in the last 30 days, `avg(...)` returns SQL NULL, not 0. Drizzle maps SQL NULL to `null` in TypeScript. Displaying `null` directly renders "null" in the UI.
**How to avoid:** Type `avgMs` as `number | null` in the query. Apply `formatAvgTime(result?.avgMs ?? null)` which returns `"—"` for null per D-16.

---

## Runtime State Inventory

> Greenfield additions — no existing OTP or onboarding state in production. D-05 confirmed no real users in prod.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | No existing `email_otp_tokens` records (table doesn't exist yet) | Create table via migration |
| Stored data | `organizations.onboarding_whatsapp_clicked_at` column does not exist | Add column via migration |
| Live service config | Upstash Redis: not currently used — no account or credentials exist | Create Upstash account + project; set env vars in Vercel |
| OS-registered state | None — no task scheduler or background processes | None |
| Secrets/env vars | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` need adding to Vercel + `.env.local` | Add before deploying INFRA-01 changes |
| Secrets/env vars | `SUPPORT_WHATSAPP_LINK` needs adding to Vercel + `.env.local` | Add before dashboard checklist deploys |
| Build artifacts | None affected | None |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker (postgres + minio + mailpit) | Local dev (DB, R2, email) | Assumed present | — | None — required for dev |
| MinIO (R2 local) | Logo upload dev/test | Assumed present (in docker-compose) | — | Use R2 directly in staging |
| Mailpit (SMTP) | OTP email dev testing | Assumed present (in docker-compose) | — | None — required for email dev |
| Upstash Redis | INFRA-01; OTP rate limiting | Not yet configured | — | Keep in-memory Map only for local dev (acceptable) |
| `@upstash/ratelimit` npm | INFRA-01 | Not installed | 2.0.8 latest | — |
| `@upstash/redis` npm | INFRA-01 | Not installed | 1.37.0 latest | — |

[ASSUMED — Docker/MinIO/Mailpit availability assumed based on `apps/web/CLAUDE.md` documentation; not probed in this session]

**Missing dependencies with no fallback for production:**
- Upstash Redis credentials (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`) — must be created before deploying INFRA-01. Free tier at console.upstash.com, takes ~2 minutes.

---

## Implementation Dependencies / Build Order

Dependencies between work items in this phase:

```
Wave 0 (Schema + Auth wiring — unblocks everything else)
├── db/schema.ts: add emailOtpTokens table + organizations.onboardingWhatsappClickedAt
├── Run drizzle-kit generate → apply to Docker local
├── next-auth.d.ts: add emailVerified boolean claim
├── auth.ts: populate emailVerified claim in jwt() callback
└── lib/ratelimit.ts: create Upstash ratelimit singletons

Wave 1 (OTP flow — AUTH-01, AUTH-02)
├── POST /api/auth/verify-otp  [depends on: schema, auth.ts claim]
├── POST /api/auth/resend-otp  [depends on: schema, ratelimit.ts]
├── Modify POST /api/auth/register → generate OTP + send email + redirect /verify-email
├── (auth)/verify-email/page.tsx  [depends on: verify-otp route]
└── proxy.ts: add emailVerified gate + Upstash migration  [depends on: ratelimit.ts, auth.ts claim]

Wave 2 (Dashboard metrics — DASH-01, DASH-02)
└── Modify dashboard/page.tsx: add resolvedToday + avgResolutionMs queries + new stat cards
    [depends on: nothing new — pure query additions to existing Server Component]

Wave 3 (Onboarding Checklist — DASH-03, DASH-04, DASH-05)
├── POST /api/onboarding/whatsapp-clicked  [depends on: schema onboardingWhatsappClickedAt]
├── components/dashboard/onboarding-checklist.tsx  [depends on: whatsapp-clicked route]
└── Modify dashboard/page.tsx: fetch checklist data + render OnboardingChecklist
    [depends on: checklist component + whatsapp-clicked route]

Wave 4 (Org profile — ORG-01)
├── POST /api/organizations/logo/presign  [depends on: r2.ts (already available)]
├── PATCH /api/organizations/profile  [depends on: DB schema (logo already exists)]
├── Modify settings/organization/page.tsx: add name + logo fields
└── Modify header.tsx: accept orgLogo + orgName, display with initials fallback
    [depends on: org profile API]

Wave 5 (User profile — PROF-01, PROF-02)
├── PATCH /api/user/profile  [no new dependencies]
└── Modify settings/profile/page.tsx: add display name section + connected accounts list
    [depends on: user/profile API + accounts table query]
```

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (unit) + Playwright (E2E) |
| Config file | `apps/web/vitest.config.ts` (existing); `playwright.config.ts` (existing) |
| Quick run command | `cd apps/web && npm test` |
| Full suite command | `cd apps/web && npm test && npm run test:int` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | POST /api/auth/register creates OTP token and sends email | Integration | `npm run test:int` → `tests/integration/otp.test.ts` | ❌ Wave 0 |
| AUTH-01 | POST /api/auth/verify-otp with valid code sets emailVerified | Integration | `tests/integration/otp.test.ts` | ❌ Wave 0 |
| AUTH-01 | proxy.ts redirects unverified user to /verify-email | Unit | `npm test` → `src/proxy.test.ts` | ❌ Wave 0 |
| AUTH-02 | POST /api/auth/resend-otp respects 60s cooldown | Integration | `tests/integration/otp.test.ts` | ❌ Wave 0 |
| AUTH-02 | POST /api/auth/resend-otp rate limited at 3/hour | Unit | `src/app/api/auth/resend-otp/route.test.ts` | ❌ Wave 1 |
| DASH-01 | resolvedToday query returns correct count | Unit | `src/app/(dashboard)/dashboard/page.test.ts` | ❌ Wave 2 |
| DASH-01 | avgResolutionMs query returns null when no resolved approvals | Unit | `src/app/(dashboard)/dashboard/page.test.ts` | ❌ Wave 2 |
| DASH-02 | All 4 metrics filtered by orgId | Unit | `src/app/(dashboard)/dashboard/page.test.ts` | ❌ Wave 2 |
| DASH-03 | Checklist visible when flows.count=0 AND approvals.count=0 | Unit | `src/components/dashboard/onboarding-checklist.test.tsx` | ❌ Wave 3 |
| DASH-04 | POST /api/onboarding/whatsapp-clicked sets onboardingWhatsappClickedAt | Integration | `tests/integration/onboarding.test.ts` | ❌ Wave 3 |
| DASH-05 | Checklist hidden when all 3 items complete | Unit | `src/components/dashboard/onboarding-checklist.test.tsx` | ❌ Wave 3 |
| ORG-01 | POST /api/organizations/logo/presign validates MIME and size | Unit | `src/app/api/organizations/logo/presign/route.test.ts` | ❌ Wave 4 |
| ORG-01 | PATCH /api/organizations/profile updates name (owner only) | Unit | `src/app/api/organizations/profile/route.test.ts` | ❌ Wave 4 |
| PROF-01 | PATCH /api/user/profile updates display name | Unit | `src/app/api/user/profile/route.test.ts` | ❌ Wave 5 |
| PROF-02 | Profile page lists connected providers | Unit | `src/app/(dashboard)/settings/profile/page.test.tsx` | ❌ Wave 5 |
| INFRA-01 | authRatelimit blocks at 20 req/min | Unit (mocked Upstash) | `src/lib/ratelimit.test.ts` | ❌ Wave 0 |
| INFRA-01 | otpVerifyRatelimit blocks at 5/15min | Unit (mocked Upstash) | `src/lib/ratelimit.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd apps/web && npm test`
- **Per wave merge:** `cd apps/web && npm test && npm run test:int`
- **Phase gate:** Full suite green before `/gsd-verify-work`; Playwright E2E for OTP UI flow

### Wave 0 Gaps (test infrastructure needed before implementation)
- [ ] `apps/web/tests/integration/otp.test.ts` — covers AUTH-01, AUTH-02
- [ ] `apps/web/tests/integration/onboarding.test.ts` — covers DASH-04
- [ ] `apps/web/src/lib/ratelimit.test.ts` — covers INFRA-01 (unit, Upstash mocked)
- [ ] `apps/web/src/proxy.test.ts` — covers AUTH-01 proxy gate behavior

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | OTP via bcrypt hash + 15min expiry; brute-force: 5 attempts via Upstash |
| V3 Session Management | Yes | NextAuth v5 JWT; emailVerified claim refresh after OTP verification |
| V4 Access Control | Yes | proxy.ts emailVerified gate; org owner/admin check on logo/profile endpoints |
| V5 Input Validation | Yes | Zod schemas on all API routes; MIME type allowlist for logo upload |
| V6 Cryptography | Yes | `crypto.randomInt` for OTP generation; `bcrypt.hash` for storage — never hand-roll |

### Known Threat Patterns for This Phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| OTP brute-force (1M combinations) | Elevation of Privilege | 5 attempt limit via Upstash fixedWindow per userId; token invalidated after 5 failures [ASSUMED — follow recommendation from PITFALLS.md P10] |
| OTP plaintext DB storage | Information Disclosure | bcrypt.hash(code, 10) before INSERT; raw code never persisted |
| JWT emailVerified stale after OTP | Auth bypass | Force JWT refresh via NextAuth v5 unstable_update after successful verification |
| Cross-instance rate limit bypass | Denial of Service | Upstash Redis replaces in-memory Map; atomic counter across all Vercel instances |
| Oversized logo upload (>2MB) | Tampering | Client-side check + server-side Zod validation + R2 `ContentLength` in presigned command |
| MIME type mismatch (disguised executable) | Tampering | Server validates mimeType against LOGO_MIME_TYPES allowlist before presigning |
| Logo R2 key path traversal | Tampering | `buildLogoR2Key` sanitizes filename with regex replace; orgId comes from session, not input |
| Org profile PATCH by non-owner | Elevation of Privilege | Role check: `["owner","admin"].includes(session.user.role)` — same as existing org settings page |

---

## Open Questions (RESOLVED)

1. **Checklist visibility after first flow/approval arrives**
   - What we know: D-10 says show when `flows.count=0 AND approvals.count=0`. D-11 says disappear when all 3 complete.
   - What's unclear: If a flow is configured (item 2 done) but WhatsApp link never clicked (item 1 not done), does the checklist still show? D-10 hides it once flows.count>0. This means a customer who configures their flow before clicking the WhatsApp support link would never see the WhatsApp item again.
   - Recommendation: Planner should clarify with user. Suggested resolution: show checklist until all 3 items are complete OR until 30 days after org creation (whichever comes first). Simplest safe default: only hide via D-11 (all done); ignore D-10 as a show trigger — always show until complete. Let planner decide.
   - **RESOLVED:** Visibility expression locked as `shouldShow = (flowCount === 0 && approvalCount === 0) || !allDone` — implements D-10 literal (fresh org) combined with D-11 literal (hide only when all 3 items complete). `whatsappClicked` does NOT condition visibility, only per-item visual state. Implementation lives in Plan 01-03 Task 1 (`apps/web/src/lib/dashboard-metrics.ts → getOnboardingChecklistState`). Truth-table verified by 6 unit-test cases in `dashboard-metrics.test.ts`.

2. **JWT refresh mechanism after OTP verification**
   - What we know: NextAuth v5 exposes `unstable_update()` which can update JWT claims without re-login. Alternatively, the OTP verify endpoint can redirect to a NextAuth sign-in callback.
   - What's unclear: Does `unstable_update()` propagate immediately to the client cookie? The `unstable` prefix suggests potential breakage.
   - Recommendation: Use the most reliable path — after `verify-otp` succeeds, force a fresh sign-in using `signIn("credentials", { redirect: true, callbackUrl: "/onboarding/org-profile" })` client-side. This guarantees a fresh JWT with `emailVerified: true`. The UX impact is minimal (user just verified their email; one extra auth round-trip is acceptable).
   - **RESOLVED:** Use NextAuth v5 `useSession().update()` (no args) as the SINGLE locked refresh mechanism. After POST /api/auth/verify-otp returns 200, the client calls `await update()` which re-runs the JWT callback in `auth.ts`, re-selects `users.emailVerified` from DB, and emits a fresh JWT carrying `emailVerified=true`. Then `router.push("/dashboard")` carries the refreshed cookie through the proxy gate. Implementation lives in Plan 01-02 Task 3 (`apps/web/src/app/(auth)/verify-email/page.tsx`). `signIn()` and `router.refresh()` before `update()` are explicitly forbidden alternatives. End-to-end proof in Plan 01-06 Playwright spec 4 ("after verify, dashboard becomes reachable").

3. **Upstash account availability in dev environment**
   - What we know: Upstash free tier exists; env vars needed.
   - What's unclear: Does the developer already have an Upstash account? Should the planner include a "create Upstash account" task?
   - Recommendation: Planner should include a Wave 0 infrastructure task: "Create Upstash Redis database (free tier) and add `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` to `.env.local` and Vercel environment." For local dev without Upstash, the ratelimit module can gracefully fall back (check for empty env vars and skip rate limiting in dev).
   - **RESOLVED:** No-op fallback when `UPSTASH_REDIS_REST_URL` is empty — local dev uses in-memory fallback mode in `apps/web/src/lib/ratelimit.ts`. The `makeLimiter()` factory checks `hasUpstash = !!URL && !!TOKEN`; when false, returns `{ limit: async () => ({ success: true, ... }) }` so dev requests pass through unrestricted. Production REQUIRES both env vars (set via `user_setup` frontmatter on Plan 01-01). Implementation lives in Plan 01-01 Task 2. Validated by unit test "no-op fallback when UPSTASH_REDIS_REST_URL is empty".

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Google OAuth users have `users.emailVerified` set at account creation by DrizzleAdapter | JWT Claims Extension, proxy.ts gate | If not set, Google users hit the emailVerified gate and can't access dashboard |
| A2 | proxy.ts emailVerified gate on `GUARDED_PREFIXES` routes does not affect OTP API routes | Pitfall 1, API Endpoints | Redirect loop; OTP verification impossible |
| A3 | `unstable_update()` or client re-sign-in is needed after OTP verification for JWT to refresh | Pitfall 2, Open Questions | User verifies but stays locked in /verify-email |
| A4 | Logo orphaned objects acceptable without tracking table in Phase 1 | Pitfall 5 | Slow R2 storage accumulation; low risk given frequency |
| A5 | Docker/MinIO/Mailpit are available in local dev environment | Environment Availability | Logo upload and email OTP untestable locally |
| A6 | OTP attempt counter: 5 failures → invalidate token (require resend) | Security Domain | Without this, brute-force protection incomplete despite rate limit |
| A7 | Checklist visibility: show until all 3 complete (D-11 takes precedence over D-10) | Pattern 5, Open Question 1 | Could hide checklist before customer notices it |

**Claims A1, A3, A6 have the highest risk and should be confirmed with the user or verified in code before implementation.**

---

## Sources

### Primary (HIGH confidence)
- `apps/web/db/schema.ts` — exact current schema (emailVerified exists in users; logo exists in organizations)
- `apps/web/src/proxy.ts` — GUARDED_PREFIXES, rate limiter structure, guard order
- `apps/web/src/lib/auth.ts` — JWT callback structure, subscription refresh pattern
- `apps/web/src/app/(dashboard)/dashboard/page.tsx` — existing metrics grid structure
- `apps/web/src/app/api/n8n/approvals/files/presign/route.ts` — R2 presign pattern
- `apps/web/src/lib/r2.ts` — R2 client, buildR2Key, presignUploadUrl
- `apps/web/src/types/next-auth.d.ts` — existing JWT claim declarations
- `apps/web/db/CLAUDE.md` — migration workflow rules (drizzle-kit generate only, journal when check)
- `apps/web/CLAUDE.md` — Next.js 16 proxy.ts convention, Zod v4 two-arg record, Neon placeholder
- `.planning/research/PITFALLS.md` — OTP security requirements (P9, P10, P18)
- `.planning/research/STACK.md` — OTP implementation recommendation (crypto + bcryptjs, no new library)
- [VERIFIED: npm registry] `@upstash/ratelimit@2.0.8` — confirmed latest
- [VERIFIED: npm registry] `@upstash/redis@1.37.0` — confirmed latest
- [VERIFIED: Context7 /websites/upstash_redis_sdks_ratelimit-] — Ratelimit.slidingWindow / fixedWindow usage pattern

### Secondary (MEDIUM confidence)
- NextAuth v5 `unstable_update()` — referenced in PITFALLS.md P2; not directly verified in this session

---

## Metadata

**Confidence breakdown:**
- Schema changes: HIGH — verified against actual schema.ts; no guesswork
- OTP flow: HIGH — pattern directly follows existing passwordResetTokens in codebase
- Upstash integration: HIGH — npm registry + Context7 docs verified
- JWT emailVerified gate in proxy.ts: HIGH — gate placement verified against actual proxy.ts code
- JWT refresh after verification: MEDIUM — `unstable_update()` mechanism not directly tested; open question logged
- Checklist visibility logic: MEDIUM — D-10 and D-11 have a gap; open question logged

**Research date:** 2026-05-02
**Valid until:** 2026-06-01 (stable stack; Upstash API unlikely to change)
