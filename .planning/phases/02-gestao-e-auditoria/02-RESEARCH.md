# Phase 02: Gestão e Auditoria — Research

**Researched:** 2026-05-03
**Domain:** Next.js 16 App Router — filter/search/export/audit patterns, Drizzle ORM query composition, proxy.ts middleware guards, Asaas customer sync
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Area 1 — Filtros, Busca e Export**
- D-01: URL searchParams (`status`, `flowId`, `dateFrom`, `dateTo`) passed to Server Component; Drizzle builds WHERE clause server-side
- D-02: `<input>` debounce 300ms → `router.push` with `?q=`; Server Component uses `ILIKE %q%` on `approvals.title`; multi-word: single ILIKE with full string (MVP)
- D-03: `GET /api/approvals/export` — same filters, streams CSV; no third-party lib; auth required; same `organizationId` isolation; client triggers download via `<a href>`
- D-04: Limit 50, offset-based (`page` URL param); UI: "Página X de Y" + Anterior/Próxima; no infinite scroll

**Area 2 — Histórico de Decisão (Audit Log)**
- D-05: New table `approval_events` — separate from `approvals`; schema: `(id uuid PK, approvalId uuid FK→approvals, eventType text NOT NULL, actorType text NOT NULL, actorId text, metadata jsonb, createdAt timestamptz DEFAULT now())`
- D-06: `eventType` as `text` (not pgEnum) — extensible for Phase 5 WhatsApp events without ALTER TYPE migration
- D-07: Phase 2 events: `approval_created` (n8n webhook), `approval_viewed` (user opens detail page), `approval_resolved` (approve/reject — metadata: `{ status, comment, decisionValues }`)
- D-08: Timeline in `/approvals/[id]` — Server Component, chronological, icon + label + actor name + timestamp
- D-09: Onboarding cadastral step (CNPJ, phone, address) — reuse `OrgProfileFormSettings` component; integrated into existing onboarding stepper
- D-10: `proxy.ts` guard — redirect to `/onboarding/cadastral` if `org.cnpj` is null for all `/dashboard/*` routes; `/admin/*` exempt
- D-11: Asaas sync `PUT /v3/customers/{asaasCustomerId}` only at onboarding completion; no sync on settings save (MVP)
- D-12: INFRA-03 is a UX problem — payload already stored; extract meaning from it
- D-13: From `flow_runs.payload` extract: execution status (already in `status`), etapas count (`executionData.resultData.runData` keys), linked approvals (JOIN `approvals` WHERE `approvals.flowRunId = flow_runs.id` or via `n8nExecutionId`)
- D-14: `/flows/[id]` — "Execuções recentes" section; columns: Data, Status, Etapas, Aprovações vinculadas, Duração; Server Component; last 20 runs; pagination link if needed

### Claude's Discretion

None explicitly stated — all gray areas were resolved in discussion.

### Deferred Ideas (OUT OF SCOPE)

- Busca AND multi-palavra para filtros de aprovação
- Sync cadastral ao salvar configurações da org
- Audit log para eventos de flows/membros (apenas aprovações em Phase 2)
- WhatsApp approval events (`whatsapp_*`) — Phase 5
- Infinite scroll para listas de aprovação
- Full run history page com filtros avançados
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| APPROV-01 | Filtrar aprovações por status (pendente, aprovada, rejeitada, expirada) | D-01: URL searchParams → Drizzle WHERE; `eq(approvals.status, ...)` |
| APPROV-02 | Filtrar aprovações por fluxo e por período (data início / data fim) | D-01: `flowId` + `dateFrom`/`dateTo` → `gte`/`lte` on `approvals.createdAt` |
| APPROV-03 | Buscar aprovações por texto livre (título, descrição, nome do fluxo) | D-02: ILIKE `%q%` on `approvals.title`; debounce 300ms client-side |
| APPROV-04 | Exportar aprovações filtradas como CSV | D-03: `GET /api/approvals/export`; manual CSV serialization; streaming Response |
| APPROV-05 | Ver histórico de decisão: quem decidiu, quando, comentário, decision values | D-05/D-08: `approval_events` table + timeline UI in `/approvals/[id]` |
| ORG-02 | Owner pode editar dados cadastrais: CNPJ, endereço, telefone | D-09: Reuses `OrgProfileForm`; columns already exist in `organizations` |
| ORG-03 | Dados cadastrais coletados no onboarding ao criar org | D-09/D-10: New step in existing stepper; proxy.ts CNPJ guard |
| ORG-04 | Dados cadastrais pré-preenchem billing Asaas | D-11: `PUT /v3/customers/{asaasCustomerId}` at onboarding completion |
| INFRA-03 | Refactor flow runs para melhorar performance e manutenibilidade | D-13/D-14: Extract etapas + linked approvals from payload; display in `/flows/[id]` |
</phase_requirements>

---

## Summary

Phase 2 is entirely within the existing Next.js 16 App Router codebase — no new external services except the already-integrated Asaas API. The work divides cleanly into four areas: (1) converting the approvals list from a client-filtered in-memory component to a server-side filtered/paginated/searchable Server Component with URL-driven state; (2) adding an `approval_events` audit table and timeline UI; (3) adding a mandatory cadastral step to onboarding and a proxy.ts CNPJ guard; (4) extracting semantic data from `flow_runs.payload` and displaying it in `/flows/[id]`.

The current `ApprovalsList` component holds all filtering state client-side (`useState<Filter>`) and does client-side array filtering — this must be replaced by server-side Drizzle queries with `searchParams` driving the WHERE clause. The table currently loads all approvals unbounded; pagination must be added. The new `approval_events` table is additive (new migration) and the three Phase 2 event types are inserted at three existing call sites: n8n webhook handler, approval detail page load, and approve/reject API routes.

The `organizations` table already has all eight cadastral columns (`cnpj`, `phone`, `address_street`, etc.) from migration `0007_org_cadastral_fields.sql`. The `OrgProfileForm` component exists at `/onboarding/org-profile/page.tsx` and is reused. The only new code required is a new onboarding route `/onboarding/cadastral`, a proxy.ts guard block, and the Asaas PUT call at completion.

**Primary recommendation:** Execute in four sequential plans: (1) migration + approval_events schema; (2) approvals list refactor (filters + search + pagination + export); (3) audit timeline in approval detail; (4) onboarding cadastral step + proxy guard + Asaas sync + flow runs UX.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Filter/search/pagination state | Frontend Server (URL searchParams) | — | Server Component re-render; URL is shareable; avoids hydration |
| Drizzle WHERE clause building | API / Backend (Server Component) | — | Runs server-side in RSC; no client exposure |
| CSV export | API / Backend (`/api/approvals/export`) | — | File never passes through client memory; streaming avoids Vercel body limit |
| Audit event insertion | API / Backend (API routes + Server Component side-effect) | — | Must run server-side for tamper-resistance |
| Timeline UI | Frontend Server (Server Component) | — | Static read; no interactivity needed |
| Debounce + router.push | Browser / Client (`"use client"` search wrapper) | — | Only interactive piece; rest stays server |
| CNPJ proxy guard | Frontend Server (proxy.ts middleware) | — | Edge-compatible; same pattern as subscription guard |
| Asaas sync | API / Backend (onboarding completion handler) | — | Server-side PUT with credentials |
| Payload extraction (etapas count) | Frontend Server (Server Component) | — | JSONB parsed at render time; no extra DB column needed |

---

## Standard Stack

### Core (already installed — verified in codebase)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.4 | App Router, Server Components, API routes | Project standard [VERIFIED: apps/web/CLAUDE.md] |
| Drizzle ORM | existing | Type-safe PostgreSQL queries | Project standard [VERIFIED: schema.ts] |
| NextAuth v5 | existing | JWT session with `organizationId` | Project standard [VERIFIED: proxy.ts] |
| Tailwind CSS v4 | existing | Styling with `@theme inline` oklch | Project standard [VERIFIED: design-system/MASTER.md] |
| shadcn/ui | existing | Component library | Project standard [VERIFIED: apps/web/CLAUDE.md] |
| Zod v4 | existing | Schema validation (z.record requires 2 args) | Project standard [VERIFIED: apps/web/CLAUDE.md] |

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | existing | Icons for timeline event types | All icon usage in this project |
| drizzle-orm operators | existing | `ilike`, `gte`, `lte`, `and`, `count` for filter queries | APPROV-01/02/03 |

**Installation:** No new packages required for Phase 2. [VERIFIED: all capabilities covered by existing stack]

---

## Architecture Patterns

### System Architecture Diagram

```
Browser
  └─ ApprovalsSearchBar (Client Component, debounce 300ms)
       └─ router.push(?q=, ?status=, ?page=, ?flowId=, ?dateFrom=, ?dateTo=)
            │
            ▼
  /approvals (Server Component)
       └─ reads searchParams (Promise — must await)
       └─ Drizzle: SELECT ... FROM approvals
              WHERE orgId=? [AND status=?] [AND flowId=?]
                    [AND createdAt>=?] [AND createdAt<=?] [AND title ILIKE ?]
              ORDER BY createdAt DESC LIMIT 50 OFFSET (page-1)*50
       └─ renders ApprovalsTable (server) + search bar client wrapper
            │
            └─ [Export button] → GET /api/approvals/export?[same params]
                    └─ mirrors page query, no LIMIT
                    └─ returns Response(csv, Content-Disposition: attachment)

  /approvals/[id] (Server Component)
       └─ Drizzle: SELECT approval + users JOIN
       └─ Drizzle: SELECT approval_events WHERE approvalId=? ORDER BY createdAt ASC
       └─ side-effect: void db.insert(approval_events, {approval_viewed})
       └─ renders ApprovalDetail + ApprovalTimeline (both server)

  POST /api/n8n/approvals   (existing)
       └─ after INSERT approvals → INSERT approval_events (approval_created, actorType=system)

  POST /api/approvals/[id]/approve|reject   (existing)
       └─ after UPDATE approvals → INSERT approval_events (approval_resolved, metadata={status,comment,decisionValues})

  /onboarding/cadastral (new Client Component)
       └─ reuses OrgProfileForm
       └─ on submit → PATCH /api/organizations/cadastral (new or reuse existing PATCH)
       └─ on success → Asaas PUT /v3/customers/{asaasCustomerId}
       └─ router.push("/dashboard")

  proxy.ts (edge middleware)
       └─ order: ratelimit → onboarding guard → emailVerified gate → CNPJ guard (NEW) → admin guard → subscription guard
       └─ CNPJ guard: if orgCnpjFilled===false AND guarded route → redirect /onboarding/cadastral

  /flows/[id] (Server Component — refactor)
       └─ Drizzle: SELECT flow_runs WHERE flowId=? ORDER BY createdAt DESC LIMIT 20
       └─ for each run: parse payload JSONB → Object.keys(executionData.resultData.runData).length
       └─ Drizzle: SELECT approvals WHERE n8nExecutionId IN [runExecutionIds]
       └─ renders FlowRunsTable: Data | Status | Etapas | Aprovações | Duração
```

### Recommended Project Structure

```
src/app/(dashboard)/approvals/
├── page.tsx                     ← refactor: accept searchParams, server query + pagination
├── approvals-search-bar.tsx     ← new: "use client", debounce + router.push
├── approvals-table.tsx          ← new (rename/replace approvals-list.tsx): server render
└── [id]/
    ├── page.tsx                 ← refactor: load events, record approval_viewed
    ├── approval-detail.tsx      ← existing (unchanged)
    └── approval-timeline.tsx    ← new: Server Component, renders events list

src/app/api/approvals/
└── export/
    └── route.ts                 ← new: GET, streams CSV

src/app/(auth)/onboarding/
└── cadastral/
    └── page.tsx                 ← new: reuses OrgProfileForm, posts cadastral data

src/app/api/n8n/approvals/
└── route.ts                     ← existing: add INSERT approval_events (approval_created)

src/app/api/approvals/[id]/
├── approve/route.ts             ← existing: add INSERT approval_events (approval_resolved)
└── reject/route.ts              ← existing: add INSERT approval_events (approval_resolved)

apps/web/db/
├── schema.ts                    ← add approvalEvents table export
└── migrations/0009_approval_events.sql  ← new migration (via drizzle-kit generate)
```

### Pattern 1: Server Component with searchParams Filters

**What:** Page accepts `searchParams: Promise<Record<string, string>>`, builds Drizzle WHERE conditionally, renders table server-side.

**When to use:** Any list page with URL-driven filter state (D-01).

```typescript
// Source: Next.js 16 App Router searchParams pattern
// [VERIFIED: /approvals/[id]/page.tsx uses `params: Promise<{id:string}>` — same async pattern]
export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const sp = await searchParams
  const session = await auth()
  const orgId = session!.user.organizationId!

  const page = Math.max(1, parseInt(sp.page ?? "1", 10))
  const PAGE_SIZE = 50

  const conditions = [eq(approvals.organizationId, orgId)]
  if (sp.status)   conditions.push(eq(approvals.status, sp.status as ApprovalStatus))
  if (sp.flowId)   conditions.push(eq(approvals.flowId, sp.flowId))
  if (sp.dateFrom) conditions.push(gte(approvals.createdAt, new Date(sp.dateFrom)))
  if (sp.dateTo)   conditions.push(lte(approvals.createdAt, new Date(sp.dateTo)))
  if (sp.q)        conditions.push(ilike(approvals.title, `%${sp.q}%`))

  const [rows, [{ total }]] = await Promise.all([
    db.select({ ... }).from(approvals)
      .leftJoin(users, eq(approvals.resolvedBy, users.id))
      .leftJoin(flows, eq(approvals.flowId, flows.id))
      .where(and(...conditions))
      .orderBy(desc(approvals.createdAt))
      .limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ total: sql<number>`count(*)::int` })
      .from(approvals).where(and(...conditions)),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  // ...
}
```

### Pattern 2: Client Search Bar (debounce → router.push)

**What:** `"use client"` wrapper that debounces input and calls `router.push` updating only `?q=` while preserving other params.

**When to use:** D-02 — text search input only.

```typescript
// Source: Next.js 16 useRouter + URLSearchParams [VERIFIED: useRouter used in existing onboarding pages]
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

**Pitfall:** Always reset `page` to `1` when search query changes, otherwise the user stays on a now-invalid page number.

### Pattern 3: CSV Streaming Export Route

**What:** API route mirrors page query (no LIMIT), returns `Response` with CSV headers.

**When to use:** D-03.

```typescript
// Source: Next.js App Router Route Handler Response API
// [VERIFIED: existing route.ts files use `return new Response(...)` pattern]
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.organizationId)
    return new Response("Unauthorized", { status: 401 })

  const { searchParams } = new URL(req.url)
  // ... same condition-building as page.tsx, no LIMIT ...

  const rows = await db.select({ ... }).from(approvals)...

  function csvEscape(v: string): string {
    return `"${v.replace(/"/g, '""')}"`
  }

  const header = "ID,Título,Status,Data,Resolvido Por,Comentário\n"
  const body = rows.map(r => [
    r.id,
    csvEscape(r.title),
    r.status,
    r.createdAt.toISOString(),
    csvEscape(r.resolvedByName ?? ""),
    csvEscape(r.comment ?? ""),
  ].join(",")).join("\n")

  return new Response(header + body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="aprovacoes-${Date.now()}.csv"`,
    },
  })
}
```

### Pattern 4: approval_events Insert (three call sites)

**What:** Insert a row into `approval_events` at each lifecycle point.

**Call sites and actor values:**

| Call site | eventType | actorType | actorId |
|-----------|-----------|-----------|---------|
| `POST /api/n8n/approvals` after insert | `approval_created` | `"system"` | `null` |
| `/approvals/[id]/page.tsx` after load | `approval_viewed` | `"user"` | `session.user.id` |
| `POST /api/approvals/[id]/approve` | `approval_resolved` | `"user"` | `session.user.id` |
| `POST /api/approvals/[id]/reject` | `approval_resolved` | `"user"` | `session.user.id` |

```typescript
// Source: existing db.insert pattern [VERIFIED: schema.ts + approve/route.ts]
void db.insert(approvalEvents).values({
  id: crypto.randomUUID(),
  approvalId: approval.id,
  eventType: "approval_resolved",
  actorType: "user",
  actorId: session.user.id,
  metadata: { status: "approved", comment, decisionValues },
})
// Use `void` (no await) for approval_viewed in Server Component to avoid blocking render.
// Use `await` in API routes where error handling matters.
```

### Pattern 5: proxy.ts CNPJ Guard (D-10)

**What:** New guard block in `proxy.ts`, after emailVerified gate, before subscription guard. Reads `session.user.orgCnpjFilled` (JWT-carried boolean) — no DB call at middleware time.

**Critical constraint:** proxy.ts runs at Edge. JWT must carry `orgCnpjFilled: boolean`. Add to `auth.ts` JWT callback (same pattern as `subscriptionStatus` and `emailVerified`). [ASSUMED — pattern extrapolated from existing JWT fields; verify in auth.ts jwt callback]

```typescript
// proxy.ts addition — after emailVerified gate, before subscription guard
const CADASTRAL_BYPASS_PATHS = new Set([
  "/onboarding/cadastral",
  "/api/auth/signout",
])

function isCadastralBypass(pathname: string): boolean {
  if (CADASTRAL_BYPASS_PATHS.has(pathname)) return true
  if (pathname.startsWith("/api/auth/")) return true
  if (pathname.startsWith("/api/organizations/")) return true  // PATCH endpoint
  return false
}

// After emailVerified gate:
if (
  session &&
  !session.user.isSuperAdmin &&
  session.user.organizationId &&
  session.user.emailVerified === true &&
  session.user.orgCnpjFilled === false &&
  !isCadastralBypass(pathname)
) {
  return NextResponse.redirect(new URL("/onboarding/cadastral", req.url))
}
```

Also add `/onboarding/cadastral` to `config.matcher` (already covered by `/onboarding/:path*`).

After successful onboarding, call `NextAuth update()` to refresh the JWT with `orgCnpjFilled: true` — same pattern used after email verification.

### Pattern 6: Drizzle Schema for approval_events

```typescript
// Source: existing schema.ts table patterns [VERIFIED: schema.ts]
export const approvalEvents = pgTable(
  "approval_events",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    approvalId: text("approval_id")
      .notNull()
      .references(() => approvals.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),  // NOT pgEnum — see D-06
    actorType: text("actor_type").notNull(),  // "user" | "system" | "whatsapp"
    actorId: text("actor_id"),               // userId or null for system
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("approval_events_approval_idx").on(t.approvalId, t.createdAt)]
)
```

Migration generated by `npm run db:generate`, then reviewed to add `IF NOT EXISTS` per db/CLAUDE.md rules.

### Pattern 7: Flow Runs — Payload Extraction (D-13)

**What:** Parse `flow_runs.payload` JSONB server-side to count etapas and compute duration.

```typescript
// Source: existing /flows/[id]/page.tsx — payload column confirmed in schema.ts
function extractRunStats(payload: unknown): { etapas: number; durationMs: number | null } {
  if (!payload || typeof payload !== "object") return { etapas: 0, durationMs: null }
  const p = payload as Record<string, unknown>
  const runData = (p as any)?.executionData?.resultData?.runData
  const etapas = runData && typeof runData === "object" ? Object.keys(runData).length : 0
  const startedAt = (p as any)?.startedAt
  const stoppedAt = (p as any)?.stoppedAt
  const durationMs =
    startedAt && stoppedAt
      ? new Date(stoppedAt).getTime() - new Date(startedAt).getTime()
      : null
  return { etapas, durationMs }
}
```

**Alternative for duration:** `flow_runs` table has `startedAt` and `finishedAt` columns directly — prefer those over parsing payload timestamps. [VERIFIED: schema.ts lines 186-188]

### Anti-Patterns to Avoid

- **Client-side filtering of all rows:** Current `ApprovalsList` loads all approvals then filters in-memory. Must be removed entirely.
- **pgEnum for eventType:** Decision D-06 — use `text`, not `pgEnum`. Adding to a pgEnum in production requires `ALTER TYPE`, which is risky.
- **DB call in proxy.ts:** Middleware runs on every request at edge. Carry `orgCnpjFilled` in the JWT instead.
- **Awaiting approval_viewed insert in RSC render path:** Adds latency to every approval page load. Use `void db.insert(...)`.
- **Manual journal editing:** Never edit `_journal.json` by hand — always `npm run db:generate`. [VERIFIED: db/CLAUDE.md]
- **Omitting `organizationId` from any query:** Every Drizzle query must filter by `orgId`. No exceptions. [VERIFIED: apps/web/src/app/CLAUDE.md]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV escaping | Complex escape library | Inline `csvEscape()` (two rules: wrap in `"`, double `"`) | RFC 4180 — two rules sufficient for this data shape |
| Debounce | Complex hook library | Inline `setTimeout` ref pattern | Zero-dep; existing codebase has no debounce lib |
| Date range filtering | Custom range logic | `gte()`/`lte()` from `drizzle-orm` | Already installed [VERIFIED: drizzle-orm in imports] |
| ILIKE search | Custom string search | `ilike()` from `drizzle-orm` | Already installed |
| Asaas HTTP calls | Custom HTTP client | Follow existing `asaas.ts` lib pattern | Already integrated [VERIFIED: src/app/CLAUDE.md billing section] |

**Key insight:** All capabilities are within the existing Drizzle + Next.js stack. Zero new packages required.

---

## Runtime State Inventory

> Not a rename/refactor phase — this section confirms no migration is needed.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | `organizations` — 8 cadastral columns already nullable; existing rows have `cnpj = null` | None — schema already correct from migration 0007 |
| Live service config | Asaas customer records — `asaasCustomerId` already in `organizations` rows | `PUT /v3/customers/{id}` called once at onboarding (D-11) |
| OS-registered state | None — verified by review of STATE.md and schema | None |
| Secrets/env vars | `ASAAS_API_KEY` already in use for billing; no new secrets | None |
| Build artifacts | None | None |

---

## Common Pitfalls

### Pitfall 1: searchParams Is a Promise in Next.js 16

**What goes wrong:** Accessing `searchParams.status` directly instead of `(await searchParams).status` causes type errors and wrong values.

**Why it happens:** Next.js 15+ made `searchParams` and `params` async (Promise). The codebase already uses this correctly for `params` (see `/approvals/[id]/page.tsx` line 16: `const { id } = await params`).

**How to avoid:** Always `const sp = await searchParams` before accessing properties.

**Warning signs:** TypeScript error "Property X does not exist on type Promise<...>".

[VERIFIED: existing `/approvals/[id]/page.tsx` line 16 shows `params: Promise<{ id: string }>`]

### Pitfall 2: pgEnum Strict Typing with inArray

**What goes wrong:** `inArray(approvals.status, ["pending", "approved"])` fails TypeScript — `string[]` is not assignable to pgEnum array.

**Why it happens:** Drizzle pgEnum columns have strict type on the `inArray` overload.

**How to avoid:** Use explicit cast: `["pending", "approved"] as const` and type as `(typeof approvalStatusEnum.enumValues[number])[]`.

**Warning signs:** TypeScript error "Argument of type 'string[]' is not assignable to..."

[VERIFIED: STATE.md — "01-03: RESOLVED_STATUSES typed as Array<enum> to satisfy inArray overload"]

### Pitfall 3: proxy.ts CNPJ Check Requires JWT Field, Not DB Call

**What goes wrong:** Querying `organizations` inside proxy.ts to check `cnpj IS NULL` — either fails on edge runtime or causes slow middleware for every request.

**Why it happens:** Middleware runs per-request at edge; Neon HTTP driver may work but adds latency.

**How to avoid:** Add `orgCnpjFilled: boolean` to JWT in `auth.ts` jwt callback (same pattern as `subscriptionStatus`). proxy.ts reads from session — zero DB calls.

**Warning signs:** Middleware timeout errors or slow TTFB on all pages after guard is added.

[ASSUMED — based on existing subscriptionStatus-in-JWT pattern]

### Pitfall 4: CSV Values With Commas or Quotes

**What goes wrong:** Approval title "Aprovação, lote 3" or comment with a `"` breaks CSV parsing.

**How to avoid:**
```typescript
function csvEscape(v: string): string {
  return `"${v.replace(/"/g, '""')}"`
}
```
Also consider CSV injection: prefix values starting with `=`, `+`, `-`, `@` with a space or `'`.

### Pitfall 5: approvals.flowRunId Does Not Exist — Use n8nExecutionId Join

**What goes wrong:** D-13 mentions joining approvals via `flowRunId` but this column does not exist in schema.

**Why it happens:** `approvals` has `flowId` (references `flows`) and `n8nExecutionId` — no `flowRunId`.

**How to avoid:** Join via `n8nExecutionId`:
```typescript
// flow_runs.n8nExecutionId and approvals.n8nExecutionId — both present
const linkedApprovals = await db
  .select({ count: sql<number>`count(*)::int`, n8nExecutionId: approvals.n8nExecutionId })
  .from(approvals)
  .where(inArray(approvals.n8nExecutionId, runExecutionIds))
  .groupBy(approvals.n8nExecutionId)
```

[VERIFIED: schema.ts — both `flowRuns.n8nExecutionId` and `approvals.n8nExecutionId` confirmed]

### Pitfall 6: Onboarding Guard Order in proxy.ts

**What goes wrong:** CNPJ guard runs before emailVerified gate, redirecting unverified users to `/onboarding/cadastral` instead of `/verify-email`.

**Why it happens:** Wrong order of guard blocks.

**How to avoid:** Add CNPJ guard AFTER emailVerified gate, BEFORE subscription guard. The comment block at the top of proxy.ts documents the required order — update it.

[VERIFIED: proxy.ts lines 22-29 document the mandatory order]

---

## Code Examples

### Drizzle ilike + gte/lte composition

```typescript
// Source: drizzle-orm operators [VERIFIED: existing route files import from "drizzle-orm"]
import { and, eq, gte, lte, ilike, desc, sql } from "drizzle-orm"

const conditions = [eq(approvals.organizationId, orgId)]
if (status)   conditions.push(eq(approvals.status, status as "pending" | "approved" | "rejected" | "expired"))
if (flowId)   conditions.push(eq(approvals.flowId, flowId))
if (dateFrom) conditions.push(gte(approvals.createdAt, new Date(dateFrom)))
if (dateTo)   conditions.push(lte(approvals.createdAt, new Date(dateTo)))
if (q)        conditions.push(ilike(approvals.title, `%${q}%`))
```

### Pagination total count

```typescript
// Source: Drizzle sql template [ASSUMED — standard pattern]
const [{ total }] = await db
  .select({ total: sql<number>`count(*)::int` })
  .from(approvals)
  .where(and(...conditions))
const totalPages = Math.ceil(total / 50)
```

### Asaas customer update (D-11)

```typescript
// Source: existing asaas.ts integration pattern [VERIFIED: src/app/CLAUDE.md billing section]
// Follow the same pattern as existing Asaas calls in lib/asaas.ts
const res = await fetch(`${ASAAS_BASE_URL}/v3/customers/${org.asaasCustomerId}`, {
  method: "PUT",
  headers: {
    "access_token": process.env.ASAAS_API_KEY!,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    cpfCnpj: org.cnpj,
    phone: org.phone,
    address: org.addressStreet,
    addressNumber: org.addressNumber,
    complement: org.addressComplement ?? undefined,
    postalCode: org.addressZipCode,
    city: org.addressCity,
    state: org.addressState,
  }),
})
// Fire-and-forget or await depending on whether onboarding should fail if Asaas fails.
// Recommendation: await and surface error — user sees onboarding incomplete; they can retry.
```

### Flow run duration from DB columns (prefer over payload parsing)

```typescript
// Source: schema.ts — flowRuns.startedAt and flowRuns.finishedAt columns [VERIFIED]
const durationMs =
  run.startedAt && run.finishedAt
    ? new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()
    : null
const durationLabel = durationMs != null
  ? durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(1)}s`
  : "—"
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side filter with useState | URL searchParams → Server Component re-render | Phase 2 | Shareable URLs, no hydration, server-side perf |
| Unbounded list load | Pagination LIMIT 50 + offset | Phase 2 | Predictable performance at scale |
| No audit trail | `approval_events` table + timeline | Phase 2 | LGPD compliance base; Phase 5 extensible |
| Raw JSON payload in flow runs | Extracted etapas count + linked approvals display | Phase 2 | User sees meaningful operational data |
| Optional cadastral data | Mandatory via proxy.ts guard | Phase 2 | Unblocks Asaas billing + LGPD + Meta registration |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `void db.insert(...)` in Server Component body is acceptable for `approval_viewed` fire-and-forget | Pattern 4 | Could silently lose view events on error; acceptable for audit completeness at MVP |
| A2 | `orgCnpjFilled: boolean` should be carried in JWT (added to auth.ts jwt callback) for proxy.ts CNPJ guard | Pattern 5 / Pitfall 3 | If auth.ts JWT callback cannot accommodate it, will need different approach; verify at implementation |
| A3 | `approvals.n8nExecutionId` reliably matches `flow_runs.n8nExecutionId` for the linked-approvals join | Pattern 7 / Pitfall 5 | If n8n doesn't set the same executionId in both the flow run and the approval creation call, join returns 0; verify with a real test run |
| A4 | `sql<number>\`count(*)::int\`` is the correct Drizzle pattern for total count | Code Examples | Minor — alternate: `count()` import if available in installed version |

**If this table were empty:** All claims verified against codebase. Four assumptions remain for planner awareness.

---

## Open Questions (RESOLVED)

1. **Does `OrgProfileForm` (used at `/onboarding/org-profile`) already handle all 8 cadastral fields?**
   - **RESOLVED ✓** — Confirmed by pattern mapper (`02-PATTERNS.md`): `OrgProfileFormSettings` already handles all 8 fields (`cnpj`, `phone`, `addressStreet`, `addressNumber`, `addressComplement`, `addressZipCode`, `addressCity`, `addressState`) and calls `PATCH /api/user/org-profile`. Onboarding page is a thin wrapper — no new form component needed.

2. **Does a PATCH `/api/organizations` endpoint already exist for cadastral updates?**
   - **RESOLVED ✓** — Confirmed by pattern mapper: `PATCH /api/user/org-profile` already exists and handles all cadastral field updates. No new API route needed for onboarding cadastral step.

3. **Should onboarding failure to sync Asaas block the user?**
   - **RESOLVED ✓** — Asaas sync failure must NOT block onboarding completion. Pattern: `try { await asaasSync(...) } catch (e) { console.error('[asaas-sync]', e) }` — log and continue. `asaasCustomerId` already set from trial creation; the PUT is enrichment only.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL (Docker pruma_db) | All DB operations | Verified (used in Phase 1) | Docker local | Neon staging |
| Asaas API | D-11 ORG-04 | Verified (`ASAAS_API_KEY` in use) | Sandbox + prod | Manual test against sandbox.asaas.com |
| Drizzle Kit (`npm run db:generate`) | Migration 0009 | Verified (used in Phase 1) | Existing | — |
| Neon HTTP driver (`npm run db:migrate`) | CI migration | Verified (Phase 1 CI working) | Existing | — |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (unit) + custom integration suite (`tests/integration/`) + Playwright (E2E) |
| Config file | `apps/web/vitest.config.ts` / `apps/web/playwright.config.ts` |
| Quick run command | `npm test` (unit — no infra) |
| Full suite command | `npm test && npm run test:int` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| APPROV-01 | Filter by status returns only matching rows | integration | `npm run test:int` (approvals.test.ts) | ❌ Wave 0 |
| APPROV-02 | Filter by flowId + dateRange returns correct subset | integration | `npm run test:int` | ❌ Wave 0 |
| APPROV-03 | ILIKE search matches title substring | integration | `npm run test:int` | ❌ Wave 0 |
| APPROV-04 | CSV export route returns valid RFC-4180 CSV | integration | `npm run test:int` | ❌ Wave 0 |
| APPROV-05 | approval_events rows created at created/viewed/resolved | integration | `npm run test:int` | ❌ Wave 0 |
| ORG-02 | PATCH org cadastral fields persists correctly | integration | `npm run test:int` (onboarding.test.ts extend) | ❌ Wave 0 |
| ORG-03 | proxy.ts redirects to /onboarding/cadastral when orgCnpjFilled=false | unit | `npm test` (proxy.test.ts) | ❌ Wave 0 |
| ORG-04 | Asaas PUT called with correct body on onboarding completion | unit (mock fetch) | `npm test` | ❌ Wave 0 |
| INFRA-03 | Flow runs table shows etapas count and linked approval count | integration | `npm run test:int` (flow.test.ts extend) | Extend ✅ |

### Sampling Rate

- **Per task commit:** `npm test` (unit — fast, no infra)
- **Per wave merge:** `npm test && npm run test:int`
- **Phase gate:** Full suite + `npx playwright test` green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/integration/approvals.test.ts` — covers APPROV-01 through APPROV-05; follow `flow.test.ts` structure
- [ ] `src/proxy.test.ts` (unit) — mock session with `orgCnpjFilled: false`, assert redirect to `/onboarding/cadastral`
- [ ] Unit test for `GET /api/approvals/export` — mock DB, assert Content-Type and CSV row count
- [ ] Extend `tests/integration/flow.test.ts` — add assertions for etapas count in flow runs section

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `await auth()` at top of every handler; redirect to `/login` if no session |
| V3 Session Management | yes | NextAuth JWT; add `orgCnpjFilled` to JWT shape in `next-auth.d.ts` |
| V4 Access Control | yes | `eq(approvals.organizationId, orgId)` on every query — mandatory, no exceptions |
| V5 Input Validation | yes | Validate `dateFrom`/`dateTo` as valid dates before `new Date()`; Zod on POST bodies |
| V6 Cryptography | no | No new crypto operations |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-tenant data leak | Information Disclosure | Every query MUST include `eq(approvals.organizationId, orgId)` — including export route |
| CSV injection | Tampering | Prefix formula-starting chars (`=`, `+`, `-`, `@`) with space; escape quotes |
| Date injection via searchParams | Tampering | `const d = new Date(sp.dateFrom); if (isNaN(d.getTime())) ignore` before using in query |
| Asaas CNPJ spoofing | Tampering | CNPJ read from `organizations` DB row (session-authenticated) — not from client input at sync time |
| Export without auth | Information Disclosure | `GET /api/approvals/export` must call `await auth()` and verify `organizationId` — same as every other route |
| approval_viewed spam | Denial of Service | Acceptable at MVP — view events are cheap inserts; no deduplication needed |

---

## Project Constraints (from CLAUDE.md)

| Directive | Source | Constraint |
|-----------|--------|------------|
| `proxy.ts` not `middleware.ts` | `apps/web/CLAUDE.md` | Route interception file is `src/proxy.ts` |
| Zod v4: `z.record()` two args | `apps/web/CLAUDE.md` | `z.record(z.string(), z.string())` — one arg is a type error |
| All queries filter by `organizationId` | `apps/web/src/app/CLAUDE.md` | Multi-tenant isolation — no exception |
| `drizzle-kit generate` — never manual SQL | `apps/web/db/CLAUDE.md` | All migrations via `npm run db:generate`; add `IF NOT EXISTS` manually after |
| Migrations must be idempotent | `apps/web/db/CLAUDE.md` | `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, DO block for FK |
| `when` in journal must be chronologically increasing | `apps/web/db/CLAUDE.md` | Verify journal entry after generate before committing |
| `npm run build` before commit | `apps/web/CLAUDE.md` | TypeScript errors only surface at build |
| Playwright before PR (UI features) | `CLAUDE.md` | All four areas touch UI — run Playwright before PR |
| Design system MASTER.md first | `apps/web/CLAUDE.md` | Read `apps/web/design-system/MASTER.md` before any new UI component |
| `toLocaleString("pt-BR")` for all dates | `apps/web/src/app/CLAUDE.md` | All date display in pt-BR locale |
| All UI text in Portuguese (pt-BR) | `apps/web/src/app/CLAUDE.md` | Mandatory for all new text |
| `feat/*` branch before touching files | `CLAUDE.md` | Check `git branch --show-current` first |
| Unit + integration tests for every new route | `apps/web/CLAUDE.md` | Both suites required before PR |
| Errors always red | `apps/web/CLAUDE.md` | Never replace error color with brand color |
| Superadmin routes (`/admin/*`) exempt from all user guards | `proxy.ts` / `apps/web/src/app/CLAUDE.md` | CNPJ guard must not apply to superadmin |

---

## Sources

### Primary (HIGH confidence)
- `apps/web/src/proxy.ts` — existing guard patterns, guard ordering, config.matcher [VERIFIED]
- `apps/web/db/schema.ts` — full table definitions: organizations (cadastral cols), approvals, flowRuns, approvalFiles [VERIFIED]
- `apps/web/src/app/(dashboard)/approvals/page.tsx` — current query (no filters, no pagination) [VERIFIED]
- `apps/web/src/app/(dashboard)/approvals/approvals-list.tsx` — current client-side filter (useState) [VERIFIED]
- `apps/web/src/app/(dashboard)/flows/[id]/page.tsx` — current runs display (status + errorMessage only) [VERIFIED]
- `apps/web/src/app/api/approvals/[id]/approve/route.ts` — existing approval mutation pattern [VERIFIED]
- `apps/web/db/CLAUDE.md` — migration idempotency rules, journal ordering [VERIFIED]
- `apps/web/src/app/CLAUDE.md` — multi-tenant isolation, Asaas integration pattern [VERIFIED]
- `apps/web/db/migrations/0007_org_cadastral_fields.sql` — confirms 8 cadastral columns exist [VERIFIED]
- `.planning/phases/02-gestao-e-auditoria/02-CONTEXT.md` — all locked decisions D-01 through D-14 [VERIFIED]

### Secondary (MEDIUM confidence)
- Next.js 16 App Router convention — `searchParams` as `Promise<>` (consistent with `params: Promise<{id:string}>` in existing files)
- Drizzle ORM `ilike`, `gte`, `lte`, `sql` template — consistent with existing import patterns in route files

### Tertiary (LOW confidence)
- None — all critical claims verified against codebase or CLAUDE.md

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in codebase; no new packages
- Architecture: HIGH — patterns derived directly from existing code
- Pitfalls: HIGH for codebase-specific (pgEnum, proxy.ts ordering, searchParams Promise); MEDIUM for novel patterns (fire-and-forget RSC insert, JWT field addition)
- Migration: HIGH — idempotency rules verified in db/CLAUDE.md; existing migration files follow the pattern

**Research date:** 2026-05-03
**Valid until:** 2026-06-03 (stable stack)
