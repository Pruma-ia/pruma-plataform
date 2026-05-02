# Phase 1: Foundation - Pattern Map

**Mapped:** 2026-05-02
**Files analyzed:** 22 new/modified files
**Analogs found:** 21 / 22

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `apps/web/db/schema.ts` | model | CRUD | self (modify) | exact |
| `apps/web/src/types/next-auth.d.ts` | config | request-response | self (modify) | exact |
| `apps/web/src/lib/auth.ts` | service | request-response | self (modify) | exact |
| `apps/web/src/lib/ratelimit.ts` | utility | request-response | `src/proxy.ts` (isRateLimited pattern) | role-match |
| `apps/web/src/proxy.ts` | middleware | request-response | self (modify) | exact |
| `apps/web/src/app/api/auth/verify-otp/route.ts` | route | request-response | `src/app/api/auth/reset-password/route.ts` | exact |
| `apps/web/src/app/api/auth/resend-otp/route.ts` | route | request-response | `src/app/api/auth/forgot-password/route.ts` | exact |
| `apps/web/src/app/api/auth/register/route.ts` | route | request-response | self (modify) | exact |
| `apps/web/src/app/api/organizations/logo/presign/route.ts` | route | file-I/O | `src/app/api/n8n/approvals/files/presign/route.ts` | exact |
| `apps/web/src/app/api/organizations/profile/route.ts` | route | CRUD | `src/app/api/approvals/[id]/approve/route.ts` | role-match |
| `apps/web/src/app/api/user/profile/route.ts` | route | CRUD | `src/app/api/approvals/[id]/approve/route.ts` | role-match |
| `apps/web/src/app/api/onboarding/whatsapp-clicked/route.ts` | route | CRUD | `src/app/api/approvals/[id]/approve/route.ts` | role-match |
| `apps/web/src/app/(auth)/verify-email/page.tsx` | component | request-response | `src/app/(auth)/forgot-password/page.tsx` | exact |
| `apps/web/src/app/(dashboard)/dashboard/page.tsx` | component | CRUD | self (modify) | exact |
| `apps/web/src/app/(dashboard)/settings/organization/page.tsx` | component | CRUD | self (modify) | exact |
| `apps/web/src/app/(dashboard)/settings/profile/page.tsx` | component | CRUD | self (modify) | exact |
| `apps/web/src/components/dashboard/header.tsx` | component | request-response | self (modify) | exact |
| `apps/web/src/components/dashboard/onboarding-checklist.tsx` | component | request-response | `src/app/(dashboard)/dashboard/page.tsx` (StatusDot pattern) | role-match |
| `apps/web/src/components/ui/tooltip.tsx` | component | request-response | no analog | none |
| `apps/web/src/app/api/auth/verify-otp/route.test.ts` | test | request-response | `src/app/api/auth/reset-password/route.test.ts` | exact |
| `apps/web/src/lib/ratelimit.test.ts` | test | request-response | `src/app/api/auth/reset-password/route.test.ts` | role-match |
| `apps/web/tests/integration/otp.test.ts` | test | request-response | `tests/integration/flow.test.ts` | exact |

---

## Pattern Assignments

### `apps/web/db/schema.ts` (model, CRUD) — MODIFY

**Analog:** self

**Add `email_otp_tokens` table** — follow `passwordResetTokens` pattern at existing lines 1-11 (imports) and the table definition block. The new table must sit after the `users` table definition:

```typescript
// Imports already present — no new imports needed
// Pattern from passwordResetTokens table (existing schema.ts)
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

**Add `onboardingWhatsappClickedAt` column to `organizations`** — insert after the `updatedAt` field before the closing paren of the `organizations` pgTable call:

```typescript
// Inside organizations pgTable — after updatedAt, before closing paren
onboardingWhatsappClickedAt: timestamp("onboarding_whatsapp_clicked_at"),
```

**Convention reminder (from db/schema.ts lines 1-11):**
- IDs: `text` with `crypto.randomUUID()` default
- Timestamps: `timestamp` with `.defaultNow().notNull()` for non-nullable, bare `timestamp()` for nullable
- FK: `.references(() => parentTable.id, { onDelete: "cascade" })`

---

### `apps/web/src/types/next-auth.d.ts` (config, request-response) — MODIFY

**Analog:** self (lines 1-27)

**Existing file** (lines 1-27):
```typescript
import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      isSuperAdmin?: boolean
      organizationId?: string
      organizationSlug?: string
      role?: "owner" | "admin" | "member" | "viewer"
      subscriptionStatus?: "active" | "trial" | "past_due" | "canceled" | "inactive"
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    isSuperAdmin?: boolean
    organizationId?: string
    organizationSlug?: string
    role?: "owner" | "admin" | "member" | "viewer"
    subscriptionStatus?: "active" | "trial" | "past_due" | "canceled" | "inactive"
    refreshedAt?: number
  }
}
```

**Add** `emailVerified?: boolean` to BOTH `Session.user` and `JWT` interfaces — same optional field pattern as `isSuperAdmin?`:

```typescript
// In Session.user block — add after isSuperAdmin
emailVerified?: boolean

// In JWT block — add after isSuperAdmin
emailVerified?: boolean
```

---

### `apps/web/src/lib/auth.ts` (service, request-response) — MODIFY

**Analog:** self (lines 51-99)

**jwt callback — existing `if (user)` block** (lines 51-99). Add `emailVerified` population in this block, parallel to the existing `isSuperAdmin` query. The DB `users.emailVerified` column is a `timestamp` — convert to boolean:

```typescript
// In the if (user) branch, alongside the existing dbUser select
// Extend the dbUser select to include emailVerified:
const [dbUser, membership] = await Promise.all([
  db
    .select({ isSuperAdmin: users.isSuperAdmin, emailVerified: users.emailVerified })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .then((r) => r[0]),
  // ... membership query unchanged
])

// After populating isSuperAdmin (line 89):
token.emailVerified = dbUser?.emailVerified !== null && dbUser?.emailVerified !== undefined
```

**session callback** (lines 148-163). Add read from JWT — same pattern as `isSuperAdmin`:
```typescript
session.user.emailVerified = (token.emailVerified as boolean | undefined) ?? undefined
```

---

### `apps/web/src/lib/ratelimit.ts` (utility, request-response) — NEW

**Analog:** `apps/web/src/proxy.ts` (lines 6-24, the existing in-memory rate limiter)

**Existing rate limiter pattern to replace** (proxy.ts lines 6-24):
```typescript
const authRateMap = new Map<string, { count: number; resetAt: number }>()
function isRateLimited(map, ip, limit, windowMs): boolean { ... }
```

**New Upstash singleton pattern** (module-level, NOT per-request):
```typescript
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// Singleton — initialized once at module level; edge-compatible (HTTP fetch)
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

// OTP verify: 5 req/15min per userId (brute-force protection)
export const otpVerifyRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(5, "15 m"),
  prefix: "pruma:otp-verify",
})

// OTP resend: 3 req/hour per userId
export const otpResendRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(3, "60 m"),
  prefix: "pruma:otp-resend",
})
```

**Usage pattern in handlers:**
```typescript
const { success } = await authRatelimit.limit(ip)
if (!success) return new NextResponse("Too Many Requests", { status: 429 })
```

---

### `apps/web/src/proxy.ts` (middleware, request-response) — MODIFY

**Analog:** self (full file, lines 1-121)

**Three changes to make to existing file:**

1. **Replace in-memory rate limiter imports/maps** (lines 6-24) with Upstash imports:
```typescript
import { authRatelimit, billingRatelimit } from "@/lib/ratelimit"
// Remove: const authRateMap, const billingRateMap, function isRateLimited
```

2. **Replace isRateLimited calls** with Upstash await calls. Existing pattern (lines 46-48):
```typescript
if (isRateLimited(authRateMap, ip, 20, 60_000)) {
  return new NextResponse("Too Many Requests", { status: 429 })
}
```
New pattern:
```typescript
const { success } = await authRatelimit.limit(ip)
if (!success) return new NextResponse("Too Many Requests", { status: 429 })
```

3. **Insert emailVerified guard** AFTER the onboarding guard (line 78) and BEFORE the admin guard (line 80). Follow same structure as subscription guard (lines 92-99):
```typescript
// ── emailVerified guard — inserts here, after onboarding guard ─────────────
const isGuardedRoute = GUARDED_PREFIXES.some((p) => pathname.startsWith(p))
if (isGuardedRoute && session && !session.user.isSuperAdmin && session.user.emailVerified === false) {
  return NextResponse.redirect(new URL("/verify-email", req.url))
}
```

4. **Add to config.matcher** (line 104-120) — add `/verify-email`:
```typescript
"/verify-email",
// Also add new API routes so proxy.ts rate-limits them:
"/api/onboarding/:path*",
"/api/organizations/:path*",
```

**Critical:** `GUARDED_PREFIXES` already scoped to `["/dashboard", "/flows", "/approvals", "/settings"]` (line 27) — OTP API routes at `/api/auth/` are NOT in this array, so they naturally bypass the emailVerified guard.

---

### `apps/web/src/app/api/auth/verify-otp/route.ts` (route, request-response) — NEW

**Analog:** `apps/web/src/app/api/auth/reset-password/route.ts` (lines 1-61)

**Imports pattern** (reset-password/route.ts lines 1-8):
```typescript
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { emailOtpTokens, users } from "../../../../../db/schema"
import { eq, and, isNull } from "drizzle-orm"
import { auth } from "@/lib/auth"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { otpVerifyRatelimit } from "@/lib/ratelimit"
```

**Zod schema pattern** (reset-password/route.ts lines 9-21):
```typescript
const schema = z.object({
  code: z.string().length(6).regex(/^\d{6}$/),
})
```

**Core handler pattern** (reset-password/route.ts lines 22-61 — adapt):
```typescript
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Rate limit by userId (not IP) — brute-force protection
  const { success } = await otpVerifyRatelimit.limit(session.user.id)
  if (!success) return NextResponse.json({ error: "Muitas tentativas. Aguarde." }, { status: 429 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Código inválido" }, { status: 400 })
  }

  // Token lookup — same pattern as reset-password/route.ts lines 32-41
  const [token] = await db
    .select()
    .from(emailOtpTokens)
    .where(and(eq(emailOtpTokens.userId, session.user.id), isNull(emailOtpTokens.usedAt)))
    .limit(1)

  if (!token) return NextResponse.json({ error: "Código inválido ou expirado" }, { status: 400 })
  if (token.expiresAt < new Date()) return NextResponse.json({ error: "Código expirado" }, { status: 400 })

  const valid = await bcrypt.compare(parsed.data.code, token.tokenHash)
  if (!valid) return NextResponse.json({ error: "Código incorreto" }, { status: 400 })

  // Mark used + set emailVerified in transaction — same dual-update as reset-password lines 52-59
  await db.transaction(async (tx) => {
    await tx.update(emailOtpTokens).set({ usedAt: new Date() }).where(eq(emailOtpTokens.id, token.id))
    await tx.update(users).set({ emailVerified: new Date() }).where(eq(users.id, session.user.id))
  })

  return NextResponse.json({ ok: true })
}
```

---

### `apps/web/src/app/api/auth/resend-otp/route.ts` (route, request-response) — NEW

**Analog:** `apps/web/src/app/api/auth/forgot-password/route.ts` (lines 1-81)

**Imports pattern** (forgot-password/route.ts lines 1-8):
```typescript
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { emailOtpTokens } from "../../../../../db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { otpResendRatelimit } from "@/lib/ratelimit"
import { sendOtpEmail } from "@/lib/email"
```

**60s cooldown check pattern** (before generateAndStoreOtp is called — check `createdAt` first):
```typescript
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { success } = await otpResendRatelimit.limit(session.user.id)
  if (!success) return NextResponse.json({ error: "Limite de reenvio atingido." }, { status: 429 })

  // 60s cooldown — check BEFORE delete (forgot-password pattern: read then act)
  const [existing] = await db
    .select({ createdAt: emailOtpTokens.createdAt })
    .from(emailOtpTokens)
    .where(eq(emailOtpTokens.userId, session.user.id))
    .limit(1)

  if (existing) {
    const elapsedMs = Date.now() - existing.createdAt.getTime()
    if (elapsedMs < 60_000) {
      const waitSecs = Math.ceil((60_000 - elapsedMs) / 1000)
      return NextResponse.json({ error: `Aguarde ${waitSecs}s antes de reenviar.` }, { status: 429 })
    }
  }

  // Delete + insert new OTP (same delete pattern as forgot-password lines 52-55)
  // ... generateAndStoreOtp + sendOtpEmail

  return NextResponse.json({ ok: true })
}
```

---

### `apps/web/src/app/api/auth/register/route.ts` (route, request-response) — MODIFY

**Analog:** self (lines 1-74)

**Existing POST handler** ends with `return NextResponse.json({ ok: true })` at line 73.

**Modify**: after inserting org and membership (line 68), call `generateAndStoreOtp` and `sendOtpEmail`, then return a redirect signal to `/verify-email`. Keep all existing schema/imports unchanged. Add imports at top:
```typescript
import { generateAndStoreOtp } from "@/lib/otp"  // new helper to extract
import { sendOtpEmail } from "@/lib/email"
```

Replace final return (line 73):
```typescript
// Generate and send OTP — fire after org creation
const code = await generateAndStoreOtp(user.id)
await sendOtpEmail(user.email!, code)

return NextResponse.json({ ok: true, redirectTo: "/verify-email" })
```

---

### `apps/web/src/app/api/organizations/logo/presign/route.ts` (route, file-I/O) — NEW

**Analog:** `apps/web/src/app/api/n8n/approvals/files/presign/route.ts` (lines 1-70) — closest match possible, identical data flow

**Imports pattern** (presign/route.ts lines 1-6):
```typescript
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { buildR2Key, presignUploadUrl } from "@/lib/r2"
import { z } from "zod"
```

**Logo-specific MIME types and size** (replace ALLOWED_MIME_TYPES/MAX_FILE_SIZE_BYTES):
```typescript
const LOGO_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"])
const LOGO_MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2MB (D-18)
```

**Auth guard pattern** (approval route uses `verifyN8nSecret`; logo uses `auth()` + role check):
```typescript
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!["owner", "admin"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // MIME validation (lines 29-33 of approval presign)
  if (!LOGO_MIME_TYPES.has(parsed.data.mimeType)) {
    return NextResponse.json({ error: "Formato não permitido. Aceitos: PNG, JPG, WebP" }, { status: 422 })
  }

  // R2 key with logos/ prefix (distinguishes from approval_files)
  const r2Key = `logos/${session.user.organizationId}/${crypto.randomUUID()}/${safe}`
  const uploadUrl = await presignUploadUrl(r2Key, parsed.data.mimeType, parsed.data.sizeBytes)

  return NextResponse.json({ uploadUrl, r2Key })
}
```

---

### `apps/web/src/app/api/organizations/profile/route.ts` (route, CRUD) — NEW

**Analog:** `apps/web/src/app/api/approvals/[id]/approve/route.ts` (lines 1-86) — auth pattern, orgId isolation

**Imports pattern** (approve/route.ts lines 1-7):
```typescript
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { organizations } from "../../../../db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"
```

**Auth + role guard** (approve/route.ts lines 14-18 adapted):
```typescript
export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!["owner", "admin"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  // ...
  await db.update(organizations)
    .set({ name: parsed.data.name, logo: parsed.data.logo, updatedAt: new Date() })
    .where(eq(organizations.id, session.user.organizationId))
  return NextResponse.json({ ok: true })
}
```

---

### `apps/web/src/app/api/user/profile/route.ts` (route, CRUD) — NEW

**Analog:** `apps/web/src/app/api/approvals/[id]/approve/route.ts` (auth pattern)

**Simpler auth guard** (no role check — any authenticated user can edit their own profile):
```typescript
export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const schema = z.object({ name: z.string().min(1).max(100) })
  // ...
  await db.update(users).set({ name: parsed.data.name, updatedAt: new Date() }).where(eq(users.id, session.user.id))
  return NextResponse.json({ ok: true })
}
```

---

### `apps/web/src/app/api/onboarding/whatsapp-clicked/route.ts` (route, CRUD) — NEW

**Analog:** `apps/web/src/app/api/approvals/[id]/approve/route.ts` (auth pattern, single DB update)

**Minimal POST handler** — no body needed, just sets a timestamp:
```typescript
export async function POST(_req: Request) {
  const session = await auth()
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  await db.update(organizations)
    .set({ onboardingWhatsappClickedAt: new Date() })
    .where(eq(organizations.id, session.user.organizationId))
  return NextResponse.json({ ok: true })
}
```

---

### `apps/web/src/app/(auth)/verify-email/page.tsx` (component, request-response) — NEW

**Analog:** `apps/web/src/app/(auth)/forgot-password/page.tsx` (lines 1-83) — exact page structure: dark glass card, logo centered top, form with state machine

**Shell pattern** (forgot-password/page.tsx lines 25-82):
```typescript
"use client"

import { useState } from "react"
import Image from "next/image"

export default function VerifyEmailPage() {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  const [cooldown, setCooldown] = useState(0) // seconds remaining for resend

  // Glass card wrapper (forgot-password line 25):
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 shadow-2xl">
      <div className="mb-7 flex flex-col items-center gap-3">
        <Image src="/logo-white.png" alt="Pruma IA" width={140} height={38} priority className="h-9 w-auto" />
        <p className="text-sm text-white/60">Verificação de e-mail</p>
      </div>
      {/* OTP input form — 6-digit code */}
    </div>
  )
}
```

**Form submission pattern** (reset-password/page.tsx lines 30-55):
```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  setLoading(true)
  setError("")
  const res = await fetch("/api/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  })
  setLoading(false)
  if (!res.ok) {
    const data = await res.json()
    setError(data.error ?? "Código inválido")
    return
  }
  setDone(true)
  // Force JWT refresh — signIn or router.push after update()
}
```

**Resend button with cooldown** — new pattern (no analog; follow D-04):
```typescript
async function handleResend() {
  const res = await fetch("/api/auth/resend-otp", { method: "POST" })
  if (res.ok) setCooldown(60)
  // Countdown timer via useEffect + setInterval
}
```

**Button/input CSS classes** — copy from forgot-password (lines 63, 67):
```typescript
// Input:
className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white
           placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/70"
// Submit button:
className="w-full rounded-lg bg-[#00AEEF] py-2.5 text-sm font-semibold text-white
           hover:bg-[#00AEEF]/90 disabled:opacity-60 transition-colors"
```

---

### `apps/web/src/app/(dashboard)/dashboard/page.tsx` (component, CRUD) — MODIFY

**Analog:** self (lines 1-115)

**Existing Promise.all pattern** (lines 13-25) — extend to add 3 new queries:
```typescript
const [flowStats, pendingApprovals, recentRuns, resolvedToday, avgResolution, checklistData] =
  await Promise.all([
    // ... existing 3 queries unchanged ...

    // NEW: Resolved today (D-14)
    db.select({ total: count() })
      .from(approvals)
      .where(and(
        eq(approvals.organizationId, orgId),
        inArray(approvals.status, ["approved", "rejected"]),
        gte(approvals.updatedAt, startOfDayUtc),
      )),

    // NEW: Avg resolution time 30d (D-15)
    db.select({
      avgMs: sql<number | null>`avg(extract(epoch from (${approvals.updatedAt} - ${approvals.createdAt})) * 1000)`
    }).from(approvals)
      .where(and(
        eq(approvals.organizationId, orgId),
        inArray(approvals.status, ["approved", "rejected"]),
        gte(approvals.updatedAt, thirtyDaysAgo),
      )),

    // NEW: Checklist data (D-07, D-08)
    db.select({ onboardingWhatsappClickedAt: organizations.onboardingWhatsappClickedAt })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1),
  ])
```

**Stats array pattern** (lines 27-44) — add 2 new stat objects with same shape:
```typescript
{
  label: "Resolvidas hoje",
  value: resolvedToday[0]?.total ?? 0,
  icon: CheckSquare,
  href: "/approvals",
  color: "text-[#0D1B4B] dark:text-[#00AEEF]",
  bg: "bg-[#E0F6FE] dark:bg-[#00AEEF]/15",
},
{
  label: "Tempo médio (30d)",
  value: formatAvgTime(avgResolution[0]?.avgMs ?? null), // string, not number
  icon: Clock,
  href: "/approvals",
  color: "text-[#00AEEF]",
  bg: "bg-[#E0F6FE] dark:bg-[#00AEEF]/15",
},
```

**Grid already handles 4 cards** (line 51): `"grid grid-cols-2 gap-4 sm:grid-cols-4"` — no change needed.

**Import additions needed:**
```typescript
import { eq, desc, count, and, gte, inArray, sql } from "drizzle-orm"
import { flows, approvals, flowRuns, organizations } from "../../../../db/schema"
import { Clock } from "lucide-react"
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist"
```

---

### `apps/web/src/app/(dashboard)/settings/organization/page.tsx` (component, CRUD) — MODIFY

**Analog:** self (lines 1-47)

**Existing pattern** (lines 9-47): Server Component, `auth()` → `orgId` → DB select → role check → conditional render of form component.

**Extend DB select** (lines 15-26) to include `name` and `logo`:
```typescript
const [org] = await db
  .select({
    name: organizations.name,     // NEW
    logo: organizations.logo,     // NEW
    cnpj: organizations.cnpj,
    // ... existing fields unchanged
  })
  .from(organizations)
  .where(eq(organizations.id, orgId))
```

**Add logo upload UI** below existing form. Logo section is a Client Component (needs browser file API). Role guard already present (line 28 `canEdit` check) — reuse same condition for new fields.

---

### `apps/web/src/app/(dashboard)/settings/profile/page.tsx` (component, CRUD) — MODIFY

**Analog:** self (lines 1-157, currently a password-change-only client component)

**Current:** Pure `"use client"` page with password change form.

**Extend with display name section** — convert page to Server Component, split into:
1. Server Component (`page.tsx`): fetch `users.name` + `accounts` table for connected providers
2. Client Component: `ProfileNameForm` + `ConnectedAccounts` (view-only)

**DB query pattern** (follow organization/page.tsx Server Component pattern lines 9-16):
```typescript
// page.tsx — Server Component
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { users, accounts } from "../../../../../db/schema"
import { eq } from "drizzle-orm"

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const [user, connectedAccounts] = await Promise.all([
    db.select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1),
    db.select({ provider: accounts.provider })
      .from(accounts)
      .where(eq(accounts.userId, session.user.id)),
  ])
  // ...
}
```

---

### `apps/web/src/components/dashboard/header.tsx` (component, request-response) — MODIFY

**Analog:** self (lines 1-29, currently accepts only `{ title: string }`)

**Current signature** (line 7): `export function Header({ title }: { title: string })`

**New signature** — add optional org logo and name:
```typescript
interface HeaderProps {
  title: string
  orgName?: string
  orgLogo?: string | null
}
export function Header({ title, orgName, orgLogo }: HeaderProps)
```

**Logo display with initials fallback** (D-20 + specifics):
```typescript
// Inside header — left side, before the title
{orgName && (
  <div className="flex items-center gap-2 mr-4">
    {orgLogo ? (
      <img src={orgLogo} alt={orgName} className="h-7 w-auto object-contain" />
    ) : (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E0F6FE]
                       text-xs font-bold text-[#0D1B4B]">
        {orgName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
      </span>
    )}
  </div>
)}
```

**Note:** Header is already a `"use client"` component (line 1). No change to that. The `orgLogo` URL from R2 will be passed as a prop from the parent Server Component (dashboard layout or page).

---

### `apps/web/src/components/dashboard/onboarding-checklist.tsx` (component, request-response) — NEW

**Analog:** `apps/web/src/app/(dashboard)/dashboard/page.tsx` — `StatusDot` pattern (lines 107-114) and card JSX pattern (lines 70-101)

**Props interface:**
```typescript
interface ChecklistProps {
  whatsappClicked: boolean
  processConfigured: boolean   // flows.count > 0
  firstApproval: boolean       // approvals.count > 0
}
```

**Card pattern** (dashboard page lines 70-71):
```typescript
"use client"

import { useState } from "react"
import { Check, ExternalLink } from "lucide-react"

export function OnboardingChecklist({ whatsappClicked, processConfigured, firstApproval }: ChecklistProps) {
  const [clicked, setClicked] = useState(whatsappClicked)

  async function handleWhatsAppClick() {
    setClicked(true)
    await fetch("/api/onboarding/whatsapp-clicked", { method: "POST" })
    window.open(process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_LINK ?? "#", "_blank")
  }

  const items = [
    { label: "Agendar suporte", done: clicked, action: handleWhatsAppClick, cta: true },
    { label: "Processo configurado", done: processConfigured },
    { label: "Primeira aprovação recebida", done: firstApproval },
  ]

  // Card wrapper follows dashboard rounded-xl border bg-card pattern (line 70)
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      {/* ... */}
    </div>
  )
}
```

---

### `apps/web/src/components/ui/tooltip.tsx` (component, request-response) — NEW

**No analog found** in codebase. Use shadcn/ui `Tooltip` component if available in project, or build minimal wrapper.

**Check first:**
```bash
ls apps/web/src/components/ui/ | grep tooltip
```

If not present, create minimal using Radix UI (already a shadcn/ui dependency):
```typescript
// Follow shadcn/ui tooltip pattern — wrap @radix-ui/react-tooltip
"use client"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
// Standard shadcn/ui tooltip export pattern
```

---

### Test Files

#### `apps/web/src/app/api/auth/verify-otp/route.test.ts` (test, request-response) — NEW

**Analog:** `apps/web/src/app/api/auth/reset-password/route.test.ts` (lines 1-81) — exact structure

**Mock pattern** (reset-password/route.test.ts lines 1-35):
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"

const mockSelect = vi.fn()
const mockUpdate = vi.fn()
let updateCallCount = 0

vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve(mockSelect()) }) }) }),
    update: () => ({ set: () => ({ where: () => { updateCallCount++; return Promise.resolve(mockUpdate()) } }) }),
    transaction: vi.fn(async (fn) => fn({ update: () => ({ set: () => ({ where: () => Promise.resolve() }) }) })),
  },
}))

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/ratelimit", () => ({
  otpVerifyRatelimit: { limit: vi.fn().mockResolvedValue({ success: true }) },
}))
vi.mock("bcryptjs", () => ({ default: { compare: vi.fn() } }))
```

**Test cases to cover** (per RESEARCH.md validation table):
- 400 for invalid code format
- 401 for no session
- 429 when rate limit hit
- 400 for wrong code (bcrypt.compare returns false)
- 400 for expired token
- 200 for valid code — verify `transaction` called, `updateCallCount === 2`

#### `apps/web/tests/integration/otp.test.ts` (test, request-response) — NEW

**Analog:** `apps/web/tests/integration/flow.test.ts` (lines 1-80) — exact integration test structure

**Mock pattern** (flow.test.ts lines 20-32):
```typescript
import { describe, it, expect, vi, beforeAll } from "vitest"

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock("@/lib/auth", () => ({ auth: mockAuth }))

vi.mock("@/lib/email", () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
}))
vi.mock("@/lib/ratelimit", () => ({
  otpVerifyRatelimit: { limit: vi.fn().mockResolvedValue({ success: true }) },
  otpResendRatelimit: { limit: vi.fn().mockResolvedValue({ success: true }) },
}))
```

**Uses real DB** (same as flow.test.ts) — imports `ctx` from `./state`, uses `beforeAll` from `./setup`.

---

## Shared Patterns

### Authentication Guard
**Source:** `apps/web/src/app/api/approvals/[id]/approve/route.ts` lines 14-18
**Apply to:** All new API routes (verify-otp, resend-otp, organizations/logo/presign, organizations/profile, user/profile, onboarding/whatsapp-clicked)
```typescript
const session = await auth()
if (!session?.user?.organizationId) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
```
For routes that only need `userId` (not orgId), check `session?.user?.id` instead.

### Role Guard (owner/admin only)
**Source:** `apps/web/src/app/(dashboard)/settings/organization/page.tsx` lines 28
**Apply to:** `organizations/logo/presign`, `organizations/profile`
```typescript
if (!["owner", "admin"].includes(session.user.role ?? "")) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
```

### Zod Validation Pattern
**Source:** `apps/web/src/app/api/auth/reset-password/route.ts` lines 17-27
**Apply to:** All new API routes
```typescript
const parsed = schema.safeParse(body)
if (!parsed.success) {
  return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
}
```
Note: Zod v4 uses `z.record(z.string(), z.unknown())` two-arg form (from apps/web/CLAUDE.md).

### Multi-tenant Query Isolation
**Source:** `apps/web/src/app/(dashboard)/dashboard/page.tsx` lines 14-24
**Apply to:** All new dashboard queries and API routes touching org data
```typescript
// Always filter by organizationId from session — never from request body
const orgId = session!.user.organizationId!
// every query: .where(eq(table.organizationId, orgId))
```

### Error Response Format
**Source:** `apps/web/src/app/api/auth/reset-password/route.ts` lines 44-46, 60
**Apply to:** All new API routes
```typescript
// 400/401/403/404/409/422: { error: "Mensagem em português" }
return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
// 200 success: { ok: true }
return NextResponse.json({ ok: true })
```

### Hashed Token Pattern
**Source:** `apps/web/src/app/api/auth/forgot-password/route.ts` lines 63-67
**Apply to:** `verify-otp` route (bcrypt.compare) and `register` route (bcrypt.hash for OTP)
```typescript
// Store: await bcrypt.hash(code, 10)  — cost 10 for OTP (faster than passwords at 12)
// Verify: await bcrypt.compare(rawCode, tokenHash)
```

### Dashboard Server Component Shell
**Source:** `apps/web/src/app/(dashboard)/settings/organization/page.tsx` lines 1-47
**Apply to:** `settings/profile/page.tsx` (when converting to Server Component)
```typescript
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Header } from "@/components/dashboard/header"

export default async function SomePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  // DB queries here
  return (
    <div>
      <Header title="..." />
      <div className="flex justify-center p-6 pt-8">
        <div className="w-full max-w-lg rounded-xl border bg-card p-8 shadow-sm">
          {/* content */}
        </div>
      </div>
    </div>
  )
}
```

### Client Component Form Shell
**Source:** `apps/web/src/app/(dashboard)/settings/profile/page.tsx` lines 1-54 (current password form)
**Apply to:** Profile display name form, OrgLogoUploadForm
```typescript
"use client"

import { useState } from "react"

export function SomeForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const res = await fetch("/api/...", { method: "PATCH", /* ... */ })
    setLoading(false)
    if (!res.ok) { const data = await res.json(); setError(data.error ?? "Erro"); return }
    setSuccess(true)
  }
  // ...
}
```

### Unit Test Mock Pattern
**Source:** `apps/web/src/app/api/auth/reset-password/route.test.ts` lines 1-50
**Apply to:** All new `*.test.ts` route files
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({ db: { /* chainable mock */ } }))
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), /* used operators */ }))
vi.mock("../../../../db/schema", () => ({ tableName: {} }))

describe("POST /api/...", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules() })
  it("retorna 4XX para ...", async () => {
    const { POST } = await import("./route")  // dynamic import after mocks
    const res = await POST(makeRequest({ /* ... */ }))
    expect(res.status).toBe(4XX)
  })
})
```

### Integration Test Pattern
**Source:** `apps/web/tests/integration/flow.test.ts` lines 1-80 + `tests/integration/setup.ts`
**Apply to:** `tests/integration/otp.test.ts`
```typescript
// vi.hoisted for mockAuth — mandatory pattern (CLAUDE.md unit test conventions)
const mockAuth = vi.hoisted(() => vi.fn())
vi.mock("@/lib/auth", () => ({ auth: mockAuth }))

// Real DB (ctx.orgId from setup.ts) — mock only auth + external services
import { ctx } from "./state"
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `apps/web/src/components/ui/tooltip.tsx` | component | request-response | No tooltip component exists in codebase; shadcn/ui pattern from Radix needed |

---

## Metadata

**Analog search scope:** `apps/web/src/` (all `.ts`, `.tsx` files), `apps/web/tests/`, `apps/web/db/`
**Files scanned:** 22 key files read directly; codebase index used for discovery
**Pattern extraction date:** 2026-05-02
