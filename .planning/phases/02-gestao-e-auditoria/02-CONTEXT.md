# Phase 02 — Gestão e Auditoria: Context

**Status:** Ready for planning
**Discussed:** 2026-05-03
**Gray areas resolved:** 4 of 4

---

## Area 1 — Filtros, Busca e Export de Aprovações

### D-01: Filtros via URL params + server re-render
URL search params (`status`, `flowId`, `dateFrom`, `dateTo`) passed to Server Component.
Drizzle builds WHERE clause server-side. No client state for filters.

**Rationale:** Server Component pattern avoids hydration; URL is shareable and bookmarkable; consistent with Next.js 16 App Router conventions.

### D-02: Busca textual — debounce no cliente → router.push
`<input>` with debounce (300ms) triggers `router.push` with `?q=` param.
Server Component uses `ILIKE %q%` on `approvals.title`.
Multi-word search: single ILIKE with full string (not AND split) for MVP.

**Rationale:** Simple, no extra infra. Re-render on server; progressive enhancement works without JS.

### D-03: Export CSV — API route server-side
`GET /api/approvals/export` applies same filters as page, streams CSV response.
No third-party lib needed for MVP (manual CSV serialization).
Auth: session required; same `organizationId` isolation as page.

**Rationale:** File never passes through client memory; Vercel free tier 4.5MB body limit avoided by streaming. Client just triggers download via `<a href>`.

### D-04: Paginação fixa — 50 por página, cursor simples
Limit 50, offset-based (page param in URL).
UI: "Página X de Y" + Anterior/Próxima.
No infinite scroll.

**Rationale:** Predictable URL, server-side simple, works without JS. 50/page is enough for current scale.

---

## Area 2 — Histórico de Decisão (Audit Log)

### D-05: Tabela `approval_events` separada (não coluna JSONB)
New table, not a column on `approvals`.

```sql
approval_events (
  id          uuid PRIMARY KEY,
  approvalId  uuid NOT NULL REFERENCES approvals(id),
  eventType   text NOT NULL,  -- NOT pgEnum (see D-06)
  actorType   text NOT NULL,  -- 'user' | 'system' | 'whatsapp'
  actorId     text,           -- userId or null for system/whatsapp
  metadata    jsonb,          -- event-specific payload
  createdAt   timestamptz NOT NULL DEFAULT now()
)
```

**Rationale:** Separate table allows querying history without loading full approval; extensible per event type; efficient indexing on `approvalId`.

### D-06: `eventType` como `text`, não pgEnum
Values: `approval_created`, `approval_viewed`, `approval_resolved`, `approval_expired`, `whatsapp_sent`, `whatsapp_approved`, `whatsapp_rejected`, `whatsapp_field_filled`, etc.

**Rationale:** Phase 5 introduces WhatsApp events (`whatsapp_*`). Adding to a pgEnum requires ALTER TYPE migration in production — risky. `text` column with app-level validation is zero-migration extensible. Constraint enforced at application layer, not DB.

### D-07: Eventos a registrar (Phase 2 scope)
- `approval_created` — quando n8n cria aprovação via webhook
- `approval_viewed` — quando aprovador abre a página da aprovação
- `approval_resolved` — quando aprovador aprova ou rejeita (inclui `metadata: { status, comment, decisionValues }`)

Phase 5 adicionará `whatsapp_*` events sem migration de schema.

### D-08: UI — Timeline dentro do detalhe da aprovação
`/approvals/[id]` page gets a timeline section showing all events in chronological order.
Each event shows: icon, label, actor name, timestamp.
Server Component: loads events via JOIN with approval query.

**Rationale:** Context-in-place is better UX than a separate audit page; user sees decision history alongside the approval detail.

---

## Area 3 — Onboarding Cadastral + Asaas

### D-09: Onboarding como step extra no fluxo existente
After email verification → existing onboarding (org name, etc.) → **new step: dados cadastrais**.
Not a separate route; integrated into existing onboarding stepper.

Fields required: `cnpj`, `phone`, `addressStreet`, `addressNumber`, `addressComplement` (optional), `addressZipCode`, `addressCity`, `addressState`.
These columns already exist in `organizations` table.

**Rationale:** Reuses existing `OrgProfileFormSettings` component from `/settings/organization`. Minimal new code.

### D-10: Preenchimento obrigatório — proxy.ts guard
`proxy.ts` (middleware) checks if org has `cnpj` filled.
If null → redirect to `/onboarding/cadastral` for all `/dashboard/*` routes.
Superadmin routes (`/admin/*`) exempt.

**Rationale:** Data required for Asaas billing and LGPD compliance. Can't be optional — Asaas customer creation fails without CNPJ. Same gate pattern used for `subscriptionStatus` (established in Phase 1, D-08).

### D-11: Asaas sync — apenas no onboarding
`organizations.asaasCustomerId` already populated at trial creation.
On onboarding completion: `PUT /v3/customers/{asaasCustomerId}` with cadastral data.
No sync on settings save (MVP).

**Rationale:** MVP simplicity. Sync-on-settings would require idempotent retry logic. Onboarding is a one-time, supervised flow — simpler to sync there. If customer updates data later, they use Asaas portal directly or we add sync in a future phase.

---

## Area 4 — Flow Runs Refactor (INFRA-03)

### D-12: INFRA-03 é problema de UX de produto, não de performance
Current state: `flow_runs` table stores full n8n execution JSON in `payload` column.
Problem: UI doesn't extract meaningful data from payload — user sees raw JSON or nothing useful.
Goal: make runs communicate value to the client.

**Rationale:** User feedback: "ele não transmite o propósito dele... quantas runs, etapas ou visualmente claro para o cliente". Not a DB performance issue — payload is already there.

### D-13: Dados a extrair do payload n8n por run
From `flow_runs.payload` (n8n execution JSON), extract and display:
- **Status da execução**: success / error / running (already in `flow_runs.status`)
- **Número de etapas executadas**: count of nodes in `executionData.resultData.runData`
- **Aprovações vinculadas**: join `approvals` WHERE `approvals.flowRunId = flow_runs.id` (or via `n8nExecutionId`)

Display these as summary stats per run row — no full JSON exposed to user.

### D-14: UI — Lista de runs dentro da página do fluxo
`/flows/[id]` page gets a "Execuções recentes" section.
Table columns: Data, Status, Etapas, Aprovações vinculadas, Duração.
Server Component: Drizzle query with LEFT JOIN approvals.
Pagination: last 20 runs shown, link to full list if needed.

**Rationale:** Context-in-place — user is already on the flow page; embedding runs avoids navigation friction. 20 runs is enough for operational monitoring without overwhelming the page.

---

## Deferred Ideas (out of Phase 2 scope)

- Busca AND multi-palavra para filtros de aprovação
- Sync cadastral ao salvar configurações da org
- Audit log para eventos de flows/membros (só aprovações em Phase 2)
- WhatsApp approval events (`whatsapp_*`) — Phase 5
- Infinite scroll para listas de aprovação
- Full run history page com filtros avançados

---

## Implementation Notes for Planner

- `approvals` page: refactor Server Component to accept `searchParams` for D-01/D-02/D-04
- `approval_events` migration: new table, index on `(approvalId, createdAt)`
- `proxy.ts`: add CNPJ check alongside existing `subscriptionStatus` check (D-10)
- Onboarding step: reuse `OrgProfileFormSettings` component, wrap in stepper (D-09)
- `/api/approvals/export`: new route, mirrors page query logic (D-03)
- `/flows/[id]`: add runs section, parse `payload` server-side (D-13/D-14)
- Design system: read `apps/web/design-system/MASTER.md` before any new UI component
