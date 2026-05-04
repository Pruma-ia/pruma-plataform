# Phase 02: Gestão e Auditoria — Pattern Map

**Mapped:** 2026-05-03
**Files analyzed:** 14 new/modified files
**Analogs found:** 13 / 14

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/app/(dashboard)/approvals/page.tsx` | page (Server Component) | CRUD + request-response | `src/app/(dashboard)/flows/[id]/page.tsx` | exact (modify) |
| `src/app/(dashboard)/approvals/approvals-search-bar.tsx` | component (Client) | event-driven | `src/app/(dashboard)/approvals/approvals-list.tsx` | role-match |
| `src/app/(dashboard)/approvals/approvals-table.tsx` | component (Server) | CRUD | `src/app/(dashboard)/approvals/approvals-list.tsx` | exact (replace) |
| `src/app/(dashboard)/approvals/[id]/page.tsx` | page (Server Component) | CRUD + event-driven | `src/app/(dashboard)/approvals/[id]/page.tsx` | exact (modify) |
| `src/app/(dashboard)/approvals/[id]/approval-timeline.tsx` | component (Server) | CRUD | `src/app/(dashboard)/flows/[id]/page.tsx` runs section | role-match |
| `src/app/api/approvals/export/route.ts` | API route | request-response | `src/app/api/approvals/[id]/approve/route.ts` | role-match |
| `src/app/(auth)/onboarding/cadastral/page.tsx` | page (Client Component) | request-response | `src/app/(auth)/onboarding/org-profile/page.tsx` | exact |
| `src/app/api/n8n/approvals/route.ts` | API route (modify) | event-driven | `src/app/api/n8n/approvals/route.ts` | exact (modify) |
| `src/app/api/approvals/[id]/approve/route.ts` | API route (modify) | CRUD | `src/app/api/approvals/[id]/approve/route.ts` | exact (modify) |
| `src/app/api/approvals/[id]/reject/route.ts` | API route (modify) | CRUD | `src/app/api/approvals/[id]/approve/route.ts` | exact (modify) |
| `src/app/(dashboard)/flows/[id]/page.tsx` | page (Server Component, modify) | CRUD | `src/app/(dashboard)/flows/[id]/page.tsx` | exact (modify) |
| `apps/web/db/schema.ts` | model/schema (modify) | — | `apps/web/db/schema.ts` approvalFiles table | exact |
| `apps/web/db/migrations/0009_approval_events.sql` | migration | — | `apps/web/db/migrations/0007_org_cadastral_fields.sql` | exact |
| `src/proxy.ts` | middleware (modify) | request-response | `src/proxy.ts` emailVerified gate | exact (modify) |

---

## Pattern Assignments

### `src/app/(dashboard)/approvals/page.tsx` (page, CRUD + request-response)

**Action:** Modify existing file — add `searchParams`, Drizzle filter composition, pagination.

**Analog:** `src/app/(dashboard)/approvals/page.tsx` (current) extended with patterns from `src/app/(dashboard)/flows/[id]/page.tsx`

**Imports to extend** (current file lines 1-7):
```typescript
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { approvals, approvalFiles, users, flows } from "../../../../db/schema"
import { eq, desc, and, gte, lte, ilike, sql } from "drizzle-orm"
import { Header } from "@/components/dashboard/header"
import { getOrgHeaderData } from "@/lib/org-header-data"
```

**searchParams signature** — must await (Next.js 16, same pattern as `params` in `/approvals/[id]/page.tsx` line 12-16):
```typescript
export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const sp = await searchParams  // MUST await — Next.js 16 Promise
  const session = await auth()
  const orgId = session!.user.organizationId!
```

**Drizzle filter composition** (current file lines 15-29 extended per RESEARCH Pattern 1):
```typescript
const PAGE_SIZE = 50
const page = Math.max(1, parseInt(sp.page ?? "1", 10))

const conditions = [eq(approvals.organizationId, orgId)]
if (sp.status)   conditions.push(eq(approvals.status, sp.status as "pending" | "approved" | "rejected"))
if (sp.flowId)   conditions.push(eq(approvals.flowId, sp.flowId))
if (sp.dateFrom) {
  const d = new Date(sp.dateFrom)
  if (!isNaN(d.getTime())) conditions.push(gte(approvals.createdAt, d))
}
if (sp.dateTo) {
  const d = new Date(sp.dateTo)
  if (!isNaN(d.getTime())) conditions.push(lte(approvals.createdAt, d))
}
if (sp.q) conditions.push(ilike(approvals.title, `%${sp.q}%`))

const [rows, [{ total }]] = await Promise.all([
  db.select({ /* same fields as current */ })
    .from(approvals)
    .leftJoin(users, eq(approvals.resolvedBy, users.id))
    .where(and(...conditions))
    .orderBy(desc(approvals.createdAt))
    .limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
  db.select({ total: sql<number>`count(*)::int` })
    .from(approvals).where(and(...conditions)),
])
const totalPages = Math.ceil(total / PAGE_SIZE)
```

---

### `src/app/(dashboard)/approvals/approvals-search-bar.tsx` (component, event-driven)

**Action:** New file — "use client", debounce 300ms + router.push preserving other params.

**Analog:** `src/app/(dashboard)/approvals/approvals-list.tsx` lines 1-2 ("use client" + useRouter pattern from onboarding pages)

**Full component pattern** (RESEARCH Pattern 2):
```typescript
"use client"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useRef, useCallback } from "react"

export function ApprovalsSearchBar({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = useCallback((value: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) { params.set("q", value); params.set("page", "1") }
      else params.delete("q")
      router.push(`${pathname}?${params.toString()}`)
    }, 300)
  }, [router, pathname, searchParams])

  return (
    <input
      type="search"
      defaultValue={defaultValue}
      onChange={(e) => handleChange(e.target.value)}
      placeholder="Buscar aprovações..."
    />
  )
}
```

**Critical:** Always reset `page` to `"1"` when `q` changes — already included above.

---

### `src/app/(dashboard)/approvals/approvals-table.tsx` (component, CRUD)

**Action:** New file — server-rendered table, replaces client-side `approvals-list.tsx`; receives pre-filtered rows as props.

**Analog:** `src/app/(dashboard)/approvals/approvals-list.tsx` (full file)

**Status/badge constants to copy verbatim** (lines 20-48):
```typescript
const STATUS_ICON: Record<string, React.ReactNode> = {
  approved: <CheckCircle className="h-4 w-4 text-[#00AEEF]" />,
  rejected: <XCircle className="h-4 w-4 text-red-400" />,
  pending: <Clock className="h-4 w-4 text-amber-500 dark:text-amber-400" />,
}
const STATUS_BADGE: Record<string, string> = {
  approved: "bg-[#E0F6FE] text-[#00AEEF] dark:bg-[#00AEEF]/15 dark:text-[#5CCFF5]",
  rejected: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400",
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
}
```

**Table structure to copy** (lines 101-195) — remove `useState`, `filter`, and client-side array filter entirely.

**New props signature** (no client state):
```typescript
export function ApprovalsTable({
  approvals,
  fileCounts,
  totalPages,
  currentPage,
}: {
  approvals: Approval[]
  fileCounts: Record<string, number>
  totalPages: number
  currentPage: number
})
```

**Date formatting** (lines 138-145 — mandatory pt-BR locale):
```typescript
new Date(a.createdAt).toLocaleString("pt-BR", {
  day: "2-digit", month: "2-digit", year: "numeric",
  hour: "2-digit", minute: "2-digit",
})
```

---

### `src/app/(dashboard)/approvals/[id]/page.tsx` (page, CRUD + event-driven)

**Action:** Modify existing file — add `approval_events` query + side-effect insert.

**Analog:** `src/app/(dashboard)/approvals/[id]/page.tsx` (full current file, lines 1-67)

**Additional import to add** at top:
```typescript
import { approvalEvents } from "../../../../../db/schema"
import { asc } from "drizzle-orm"
```

**Additional query after existing queries** (after line 46, after `fileRows` query):
```typescript
const events = await db
  .select()
  .from(approvalEvents)
  .where(eq(approvalEvents.approvalId, id))
  .orderBy(asc(approvalEvents.createdAt))
```

**Fire-and-forget view event** (add before `return`, use `void` — do not block render):
```typescript
void db.insert(approvalEvents).values({
  id: crypto.randomUUID(),
  approvalId: id,
  eventType: "approval_viewed",
  actorType: "user",
  actorId: session!.user.id,
})
```

**Auth/tenant guard unchanged** (current lines 17-19):
```typescript
const { id } = await params
const session = await auth()
const orgId = session!.user.organizationId!
```

---

### `src/app/(dashboard)/approvals/[id]/approval-timeline.tsx` (component, CRUD)

**Action:** New file — Server Component (no "use client"), renders ordered event list.

**Analog:** `src/app/(dashboard)/flows/[id]/page.tsx` runs section (lines 72-93)

**Section structure to follow** (flows page lines 72-93):
```typescript
<div className="rounded-xl border bg-card shadow-sm">
  <div className="border-b px-6 py-4">
    <h2 className="font-semibold">Histórico de decisão</h2>
  </div>
  <div className="divide-y">
    {events.map((event) => (
      <div key={event.id} className="px-6 py-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{EVENT_LABEL[event.eventType] ?? event.eventType}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(event.createdAt).toLocaleString("pt-BR")}
          </span>
        </div>
        {/* actor display */}
      </div>
    ))}
  </div>
</div>
```

**Event label map** (D-07 Phase 2 events):
```typescript
const EVENT_LABEL: Record<string, string> = {
  approval_created: "Aprovação criada",
  approval_viewed: "Visualizada",
  approval_resolved: "Decisão registrada",
}
```

**Props:** `events: ApprovalEvent[]` — pure presentational, no DB call inside component.

---

### `src/app/api/approvals/export/route.ts` (API route, request-response)

**Action:** New file — GET handler, mirrors page query without LIMIT, returns CSV.

**Analog:** `src/app/api/approvals/[id]/approve/route.ts` (full file)

**Auth/tenant guard** (approve/route.ts lines 14-18):
```typescript
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
```

**searchParams extraction** (App Router GET — `new URL(req.url)`):
```typescript
const { searchParams: sp } = new URL(req.url)
// Build same conditions as page.tsx but without LIMIT
```

**CSV response pattern** (RESEARCH Pattern 3 + CSV injection prevention):
```typescript
function csvEscape(v: string): string {
  return `"${v.replace(/"/g, '""')}"`
}
function csvSafe(v: string): string {
  return /^[=+\-@]/.test(v) ? ` ${v}` : v
}

const header = "ID,Título,Status,Fluxo,Data,Resolvido Por,Comentário\n"
const body = rows.map(r => [
  r.id,
  csvEscape(csvSafe(r.title ?? "")),
  r.status,
  csvEscape(r.flowName ?? ""),
  r.createdAt.toISOString(),
  csvEscape(r.resolvedByName ?? ""),
  csvEscape(csvSafe(r.comment ?? "")),
].join(",")).join("\n")

return new Response(header + body, {
  headers: {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="aprovacoes-${Date.now()}.csv"`,
  },
})
```

**Security:** Must include `eq(approvals.organizationId, orgId)` in ALL conditions — cross-tenant leak risk if omitted.

---

### `src/app/(auth)/onboarding/cadastral/page.tsx` (page, Client Component)

**Action:** New file — mandatory onboarding step (no skip button).

**Analog:** `src/app/(auth)/onboarding/org-profile/page.tsx` (full file, lines 1-34)

**Structure to copy** (org-profile page lines 1-34, key difference: no `onSkip`):
```typescript
"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { OrgProfileForm } from "@/components/org-profile-form"

export default function CadastralOnboardingPage() {
  const router = useRouter()

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 shadow-2xl w-full max-w-lg">
      <div className="mb-7 flex flex-col items-center gap-3">
        <Image src="/logo-white.png" alt="Pruma IA" width={140} height={38} priority className="h-9 w-auto" />
        <p className="text-sm text-white/60">Dados cadastrais da sua organização</p>
        <p className="text-xs text-white/40 text-center">
          Necessários para emissão de cobranças Asaas e conformidade LGPD.
        </p>
      </div>
      <OrgProfileForm
        onSuccess={() => router.push("/dashboard")}
        theme="dark"
        // NO onSkip — step is mandatory per D-10
      />
    </div>
  )
}
```

**OrgProfileForm already calls** `PATCH /api/user/org-profile` (org-profile-form.tsx line 127) and handles all 8 cadastral fields — no new API route needed.

**After onboarding success** — call `update()` from `next-auth/react` to refresh JWT with `orgCnpjFilled: true`. Same pattern as emailVerified refresh in auth.ts lines 152-160 (re-reads field on next JWT rotation).

---

### `src/app/api/n8n/approvals/route.ts` (API route, modify)

**Action:** Modify existing file — add `approval_created` event insert after approval creation.

**Analog:** `src/app/api/n8n/approvals/route.ts` (full current file)

**Import to add** at line 3:
```typescript
import { approvals, approvalFiles, approvalFileUploads, flows, organizations,
         organizationMembers, users, approvalEvents } from "../../../../../db/schema"
```

**Insert point** (after line 147, after `const [approval] = approvalResult`):
```typescript
await db.insert(approvalEvents).values({
  id: crypto.randomUUID(),
  approvalId: approval.id,
  eventType: "approval_created",
  actorType: "system",
  actorId: null,
})
```

Use `await` (not `void`) — in API routes, event insertion failure should surface.

---

### `src/app/api/approvals/[id]/approve/route.ts` and `reject/route.ts` (API routes, modify)

**Action:** Modify both — add `approval_resolved` event after status update.

**Analog:** `src/app/api/approvals/[id]/approve/route.ts` (full current file)

**Import to add** at line 4:
```typescript
import { approvals, approvalFiles, approvalEvents } from "../../../../../../db/schema"
```

**Insert point in approve** (after `db.update(approvals).set({status: "approved"...})`, before callback dispatch, after line ~60):
```typescript
await db.insert(approvalEvents).values({
  id: crypto.randomUUID(),
  approvalId: id,
  eventType: "approval_resolved",
  actorType: "user",
  actorId: session.user.id,
  metadata: {
    status: "approved",
    comment: comment ?? null,
    decisionValues: decisionValues ?? null,
  },
})
```

**Same pattern for reject** — `status: "rejected"` in metadata. Both use `await`.

**Existing auth/tenant guard to preserve unchanged** (approve/route.ts lines 14-18 + 28-32):
```typescript
const session = await auth()
if (!session?.user?.organizationId) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
// ...
.where(and(eq(approvals.id, id), eq(approvals.organizationId, session.user.organizationId)))
```

---

### `src/app/(dashboard)/flows/[id]/page.tsx` (page, modify)

**Action:** Modify existing file — extend runs section with etapas count, linked approvals count, and duration.

**Analog:** `src/app/(dashboard)/flows/[id]/page.tsx` (full current file, lines 1-96)

**Additional imports** (extend current line 3):
```typescript
import { flows, flowRuns, approvals } from "../../../../../db/schema"
import { eq, and, desc, inArray, sql } from "drizzle-orm"
```

**Payload extraction helper** (add as file-level function before component):
```typescript
function extractEtapas(payload: unknown): number {
  if (!payload || typeof payload !== "object") return 0
  const runData = (payload as Record<string, unknown> & {
    executionData?: { resultData?: { runData?: Record<string, unknown> } }
  })?.executionData?.resultData?.runData
  return runData && typeof runData === "object" ? Object.keys(runData).length : 0
}
```

**Duration from DB columns** (prefer over payload — schema.ts lines 186-188 confirmed both exist):
```typescript
const durationMs = run.startedAt && run.finishedAt
  ? new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()
  : null
const durationLabel = durationMs != null
  ? durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(1)}s`
  : "—"
```

**Linked approvals join** (use `n8nExecutionId` — NOT `flowRunId`, RESEARCH Pitfall 5):
```typescript
const runExecutionIds = runs
  .map(r => r.n8nExecutionId)
  .filter((id): id is string => id !== null)

const linkedCounts = runExecutionIds.length > 0
  ? await db
      .select({
        n8nExecutionId: approvals.n8nExecutionId,
        count: sql<number>`count(*)::int`,
      })
      .from(approvals)
      .where(inArray(approvals.n8nExecutionId, runExecutionIds))
      .groupBy(approvals.n8nExecutionId)
  : []
const linkedMap = Object.fromEntries(linkedCounts.map(r => [r.n8nExecutionId, r.count]))
```

**Table section** (replaces current lines 72-93 "divide-y" run list):
```typescript
<table className="w-full text-sm">
  <thead>
    <tr className="border-b border-border bg-muted/30">
      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Etapas</th>
      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Aprovações</th>
      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Duração</th>
    </tr>
  </thead>
  ...
</table>
```

---

### `apps/web/db/schema.ts` (model, modify)

**Action:** Add `approvalEvents` table export + relations.

**Analog:** `approvalFiles` table (lines 237-255) — same pattern: separate table, FK to `approvals` with cascade, composite index on FK + timestamp.

**Table definition** (follow existing schema conventions — `text` id, `crypto.randomUUID()`, `withTimezone: true` on timestamp):
```typescript
export const approvalEvents = pgTable(
  "approval_events",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    approvalId: text("approval_id")
      .notNull()
      .references(() => approvals.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),  // text NOT pgEnum — D-06
    actorType: text("actor_type").notNull(),  // "user" | "system"
    actorId: text("actor_id"),               // userId or null for system
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("approval_events_approval_idx").on(t.approvalId, t.createdAt)]
)
```

No `updatedAt` — events are immutable (same as `approvalFiles`).

**Relations to add** (follow `approvalFilesRelations` at lines 363-372):
```typescript
export const approvalEventsRelations = relations(approvalEvents, ({ one }) => ({
  approval: one(approvals, {
    fields: [approvalEvents.approvalId],
    references: [approvals.id],
  }),
}))
```

---

### `apps/web/db/migrations/0009_approval_events.sql` (migration)

**Action:** Generated by `npm run db:generate`, then manually patched for idempotency.

**Analog:** db/CLAUDE.md idempotency rules (mandatory — same pattern applied to all migrations)

**Required patches after generation** (db/CLAUDE.md rules):
```sql
-- Patch 1: CREATE TABLE
CREATE TABLE IF NOT EXISTS "approval_events" (
  "id" text PRIMARY KEY NOT NULL,
  "approval_id" text NOT NULL,
  "event_type" text NOT NULL,
  "actor_type" text NOT NULL,
  "actor_id" text,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

-- Patch 2: FK constraint (DO block for idempotency)
DO $$ BEGIN
  ALTER TABLE "approval_events"
    ADD CONSTRAINT "approval_events_approval_id_approvals_id_fk"
    FOREIGN KEY ("approval_id") REFERENCES "approvals"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Patch 3: Index
CREATE INDEX IF NOT EXISTS "approval_events_approval_idx"
  ON "approval_events" ("approval_id", "created_at");
```

**Journal check (mandatory):** After `npm run db:generate`, verify `when` in `meta/_journal.json` new entry is greater than the previous entry.

---

### `src/proxy.ts` (middleware, modify)

**Action:** Add CNPJ guard block — insert after emailVerified verified-user redirect (line 122), before admin guard (line 124).

**Analog:** emailVerified gate in `src/proxy.ts` (lines 101-122) — copy the exact same guard structure.

**Guard block to insert** (after line 122):
```typescript
// ── CNPJ guard (D-10) — verificado mas sem CNPJ → /onboarding/cadastral ────
const CADASTRAL_BYPASS: Set<string> = new Set([
  "/onboarding/cadastral",
  "/api/auth/signout",
])
function isCadastralBypass(p: string): boolean {
  if (CADASTRAL_BYPASS.has(p)) return true
  if (p.startsWith("/api/auth/")) return true
  if (p.startsWith("/api/user/org-profile")) return true  // PATCH used by OrgProfileForm
  return false
}

if (
  session &&
  !session.user.isSuperAdmin &&
  session.user.organizationId &&
  session.user.emailVerified === true &&
  session.user.orgCnpjFilled === false &&  // JWT boolean — no DB call at edge
  !isCadastralBypass(pathname)
) {
  return NextResponse.redirect(new URL("/onboarding/cadastral", req.url))
}
```

**Mandatory guard order** (from proxy.ts lines 20-29 comment — update comment block):
1. Rate limiting (lines 58-83, unchanged)
2. Onboarding guard (lines 86-99, unchanged)
3. emailVerified gate (lines 101-122, unchanged)
4. **CNPJ guard** (NEW — insert here)
5. Admin guard (lines 124-132, unchanged)
6. Subscription guard (lines 134-144, unchanged)

**JWT prerequisite:** Add `orgCnpjFilled: boolean` to:
- `auth.ts` jwt callback — read `organizations.cnpj IS NOT NULL` same pattern as `emailVerified` (lines 68-99). Re-read on subscription refresh cycle.
- `auth.ts` session callback (lines 166-184) — `session.user.orgCnpjFilled = token.orgCnpjFilled as boolean`
- `src/types/next-auth.d.ts` — add `orgCnpjFilled: boolean` to `Session["user"]` augmentation.

**config.matcher** — `/onboarding/cadastral` already covered by `/onboarding/:path*` (line 152). No change needed.

---

## Shared Patterns

### Authentication Guard
**Source:** `src/app/api/approvals/[id]/approve/route.ts` lines 14-18
**Apply to:** All new API routes
```typescript
const session = await auth()
if (!session?.user?.organizationId) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
```

### Multi-Tenant Isolation (CRITICAL)
**Source:** `src/app/api/approvals/[id]/approve/route.ts` lines 28-32 + `src/app/CLAUDE.md`
**Apply to:** Every Drizzle query in every new/modified file. No exceptions.
```typescript
// Always include orgId in WHERE:
.where(and(eq(approvals.id, id), eq(approvals.organizationId, session.user.organizationId)))
```

### Zod Validation
**Source:** `src/app/api/user/org-profile/route.ts` lines 8-17 + 65-69
**Apply to:** All new API routes with request bodies
```typescript
const parsed = schema.safeParse(body)
if (!parsed.success) {
  return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
}
```
**Zod v4 constraint:** `z.record()` always takes two args: `z.record(z.string(), z.unknown())`.

### Date Formatting
**Source:** `src/app/(dashboard)/approvals/approvals-list.tsx` lines 138-145
**Apply to:** All new UI components displaying dates
```typescript
new Date(value).toLocaleString("pt-BR", {
  day: "2-digit", month: "2-digit", year: "numeric",
  hour: "2-digit", minute: "2-digit",
})
```

### Server Component Page Structure
**Source:** `src/app/(dashboard)/approvals/[id]/page.tsx` lines 12-19
**Apply to:** All new Server Component pages
```typescript
export default async function PageName({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params      // MUST await — Next.js 16
  const session = await auth()
  const orgId = session!.user.organizationId!
  const orgHeader = await getOrgHeaderData(orgId)
  return (
    <div>
      <Header title="..." orgName={orgHeader.name} orgLogoUrl={orgHeader.logoUrl} />
      ...
    </div>
  )
}
```

### approval_events Insert (all four call sites)
**Source:** insert pattern from `src/app/api/n8n/approvals/route.ts` lines 125-147 + `src/app/api/approvals/[id]/approve/route.ts`

| Call site | eventType | actorType | actorId | await vs void |
|---|---|---|---|---|
| `POST /api/n8n/approvals` | `approval_created` | `"system"` | `null` | `await` |
| `/approvals/[id]/page.tsx` RSC | `approval_viewed` | `"user"` | `session!.user.id` | `void` (non-blocking) |
| `POST /api/approvals/[id]/approve` | `approval_resolved` | `"user"` | `session.user.id` | `await` |
| `POST /api/approvals/[id]/reject` | `approval_resolved` | `"user"` | `session.user.id` | `await` |

### Integration Test Structure
**Source:** `tests/integration/flow.test.ts` lines 1-60
**Apply to:** New `tests/integration/approvals.test.ts`
```typescript
// vi.hoisted ensures mockAuth initialized before vi.mock factory:
const mockAuth = vi.hoisted(() => vi.fn())
vi.mock("@/lib/auth", () => ({ auth: mockAuth }))

import { ctx } from "./state"  // shared org/user IDs

// callbackUrl: .test TLD passes validateCallbackUrl without mocking:
const CALLBACK_URL = "https://n8n.callback.test/webhook/abc"

// Inject session per test:
mockAuth.mockResolvedValue({
  user: { id: ctx.userId, organizationId: ctx.orgId, role: "owner" }
})
```

---

## No Analog Found

| File | Role | Reason |
|---|---|---|
| `src/types/next-auth.d.ts` (modify) | type augmentation | File exists but adding `orgCnpjFilled: boolean` is a straightforward extension of the established pattern — `emailVerified` and `subscriptionStatus` in auth.ts lines 168-184 show the exact shape to follow. |

---

## Critical Anti-Patterns (from RESEARCH — do not violate)

| Anti-Pattern | Consequence | Correct Approach |
|---|---|---|
| `pgEnum` for `eventType` | ALTER TYPE needed to add Phase 5 WhatsApp events in prod | Use `text` column (D-06) |
| DB call in proxy.ts | Edge runtime latency / timeout on every request | Carry `orgCnpjFilled` in JWT |
| `await` approval_viewed insert in RSC | Adds latency to every approval page load | Use `void db.insert(...)` |
| `searchParams.x` without await | Type error + wrong values (Next.js 16 Promise) | Always `const sp = await searchParams` |
| Missing `organizationId` filter | Cross-tenant data leak | Include in every Drizzle query |
| Manual `_journal.json` edit | Migration silently skipped in prod | Always `npm run db:generate` |
| Migration without IF NOT EXISTS | CI fails on re-run with "already exists" error | Add `IF NOT EXISTS` after generate |

---

## Metadata

**Analog search scope:** `apps/web/src/app/`, `apps/web/src/lib/`, `apps/web/db/`, `apps/web/src/proxy.ts`, `apps/web/src/components/`
**Source files read:** 16
**Pattern extraction date:** 2026-05-03
