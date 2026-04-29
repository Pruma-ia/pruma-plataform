# Graph Report - /Users/marcelomattioli/vsc/pruma-plataform/apps  (2026-04-29)

## Corpus Check
- Large corpus: 301 files · ~200,673 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 1077 nodes · 1279 edges · 63 communities detected
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 77 edges (avg confidence: 0.82)
- Token cost: 85,050 input · 22,660 output

## Community Hubs (Navigation)
- [[_COMMUNITY_API Routes Hub|API Routes Hub]]
- [[_COMMUNITY_Approval API Coverage|Approval API Coverage]]
- [[_COMMUNITY_Design System Components|Design System Components]]
- [[_COMMUNITY_Admin API & Tests|Admin API & Tests]]
- [[_COMMUNITY_Approval UI Components|Approval UI Components]]
- [[_COMMUNITY_Auth & Database Migrations|Auth & Database Migrations]]
- [[_COMMUNITY_Project Config & Docs|Project Config & Docs]]
- [[_COMMUNITY_Table Design Patterns|Table Design Patterns]]
- [[_COMMUNITY_Empty States & CTA UI|Empty States & CTA UI]]
- [[_COMMUNITY_Brand Color System|Brand Color System]]
- [[_COMMUNITY_Navigation Patterns|Navigation Patterns]]
- [[_COMMUNITY_Database Schema|Database Schema]]
- [[_COMMUNITY_Typography System|Typography System]]
- [[_COMMUNITY_Loading States|Loading States]]
- [[_COMMUNITY_Design System Overview|Design System Overview]]
- [[_COMMUNITY_Member Management CRUD|Member Management CRUD]]
- [[_COMMUNITY_R2 Storage Layer|R2 Storage Layer]]
- [[_COMMUNITY_Asaas Billing & Webhooks|Asaas Billing & Webhooks]]
- [[_COMMUNITY_Modal Design Patterns|Modal Design Patterns]]
- [[_COMMUNITY_Form Input Patterns|Form Input Patterns]]
- [[_COMMUNITY_Button Design System|Button Design System]]
- [[_COMMUNITY_Coverage Report Utils A|Coverage Report Utils A]]
- [[_COMMUNITY_Coverage Sort Utils|Coverage Sort Utils]]
- [[_COMMUNITY_n8n Integration Layer|n8n Integration Layer]]
- [[_COMMUNITY_Billing Checkout Flow|Billing Checkout Flow]]
- [[_COMMUNITY_Coverage Block Nav A|Coverage Block Nav A]]
- [[_COMMUNITY_Coverage Prettify Utils|Coverage Prettify Utils]]
- [[_COMMUNITY_Email Notification System|Email Notification System]]
- [[_COMMUNITY_Brazilian Address Utils|Brazilian Address Utils]]
- [[_COMMUNITY_Auth & Admin Layout|Auth & Admin Layout]]
- [[_COMMUNITY_Asaas API Client|Asaas API Client]]
- [[_COMMUNITY_File Check Utilities|File Check Utilities]]
- [[_COMMUNITY_Shared UI Components|Shared UI Components]]
- [[_COMMUNITY_Admin Org Sub-pages|Admin Org Sub-pages]]
- [[_COMMUNITY_Legal & LGPD Pages|Legal & LGPD Pages]]
- [[_COMMUNITY_Coverage Block Nav B|Coverage Block Nav B]]
- [[_COMMUNITY_Coverage Block Nav C|Coverage Block Nav C]]
- [[_COMMUNITY_Theme Provider|Theme Provider]]
- [[_COMMUNITY_n8n Flows Webhook|n8n Flows Webhook]]
- [[_COMMUNITY_Business Rules Docs|Business Rules Docs]]
- [[_COMMUNITY_File Upload Business Rules|File Upload Business Rules]]
- [[_COMMUNITY_Onboarding Token Flow|Onboarding Token Flow]]
- [[_COMMUNITY_Brand Assets|Brand Assets]]
- [[_COMMUNITY_Password Change Route|Password Change Route]]
- [[_COMMUNITY_E2E Design Preview Tests|E2E Design Preview Tests]]
- [[_COMMUNITY_Component Group 105|Component Group 105]]
- [[_COMMUNITY_Component Group 106|Component Group 106]]
- [[_COMMUNITY_Component Group 107|Component Group 107]]
- [[_COMMUNITY_Component Group 108|Component Group 108]]
- [[_COMMUNITY_Component Group 109|Component Group 109]]
- [[_COMMUNITY_Component Group 142|Component Group 142]]
- [[_COMMUNITY_Component Group 143|Component Group 143]]
- [[_COMMUNITY_Component Group 144|Component Group 144]]
- [[_COMMUNITY_Component Group 145|Component Group 145]]
- [[_COMMUNITY_Component Group 146|Component Group 146]]
- [[_COMMUNITY_Component Group 147|Component Group 147]]
- [[_COMMUNITY_Component Group 148|Component Group 148]]
- [[_COMMUNITY_Component Group 149|Component Group 149]]
- [[_COMMUNITY_Component Group 150|Component Group 150]]
- [[_COMMUNITY_Component Group 151|Component Group 151]]
- [[_COMMUNITY_Component Group 152|Component Group 152]]
- [[_COMMUNITY_Component Group 153|Component Group 153]]
- [[_COMMUNITY_Component Group 154|Component Group 154]]

## God Nodes (most connected - your core abstractions)
1. `Drizzle ORM` - 49 edges
2. `LCOV Coverage Report — All Files (100%)` - 26 edges
3. `API Route: /api/n8n/approvals` - 22 edges
4. `Typography System` - 19 edges
5. `Pruma IA Design System — Index Page` - 17 edges
6. `Buttons Design System Section` - 17 edges
7. `API Route: /api/n8n/approvals/files/presign` - 14 edges
8. `Design System Sidebar Navigation` - 14 edges
9. `API Route: /api/maintenance/cleanup-pending-uploads (GET)` - 13 edges
10. `apps/web/CLAUDE.md` - 12 edges

## Surprising Connections (you probably didn't know these)
- `API Route: /api/maintenance/retry-failed-callbacks` --queries_and_updates--> `DB table: approvals — human approval requests with callbackUrl, decisionFields, callbackStatus`  [EXTRACTED]
  /Users/marcelomattioli/vsc/pruma-plataform/apps/web/coverage/app/api/maintenance/retry-failed-callbacks/index.html → apps/web/db/schema.ts
- `API Route: /api/maintenance/retry-failed-callbacks` --queries--> `DB table: approvalFiles — R2-backed file attachments linked to approvals`  [EXTRACTED]
  /Users/marcelomattioli/vsc/pruma-plataform/apps/web/coverage/app/api/maintenance/retry-failed-callbacks/index.html → apps/web/db/schema.ts
- `API Route: /api/maintenance/retry-failed-callbacks` --enforces--> `Business rule: retry failed callbacks up to MAX_RETRIES=5 within 48h window; statuses: sent/failed/exhausted/blocked`  [EXTRACTED]
  /Users/marcelomattioli/vsc/pruma-plataform/apps/web/coverage/app/api/maintenance/retry-failed-callbacks/index.html → apps/web/src/app/api/maintenance/retry-failed-callbacks/route.ts
- `API Route: /api/maintenance/retry-failed-callbacks` --has_debt--> `Known debt: retry-failed-callbacks has no automatic cron trigger (Vercel free tier limitation — 15min unsupported)`  [EXTRACTED]
  /Users/marcelomattioli/vsc/pruma-plataform/apps/web/coverage/app/api/maintenance/retry-failed-callbacks/index.html → apps/web/src/app/api/maintenance/retry-failed-callbacks/route.ts
- `API Route: /api/n8n/approvals` --queries--> `DB table: flows — n8n workflow references (prumaFlowId, n8nWorkflowId) per org`  [EXTRACTED]
  /Users/marcelomattioli/vsc/pruma-plataform/apps/web/coverage/app/api/n8n/approvals/index.html → apps/web/db/schema.ts

## Communities

### Community 0 - "API Routes Hub"
Cohesion: 0.03
Nodes (22): POST(), POST(), mapAsaasStatus(), POST(), verifyWebhookToken(), NotFound(), Drizzle ORM, POST() (+14 more)

### Community 1 - "Approval API Coverage"
Cohesion: 0.05
Nodes (75): API Group: /api/approvals — approval lifecycle endpoints, API Route: /api/approvals/[id]/files (GET), API Route: /api/approvals/[id]/files/[fileId]/check (GET), API Route: /api/approvals/[id]/reject (POST), API Route: /api/auth/accept-terms (POST), API Route: /api/auth/forgot-password (POST), API Group: /api/auth — authentication and user lifecycle endpoints, API Route: /api/auth/onboarding (POST) (+67 more)

### Community 2 - "Design System Components"
Cohesion: 0.06
Nodes (51): Alert Card: Atenção — 3 aprovações pendentes há mais de 48h, Alert Card: Erro — falha ao sincronizar com n8n, Alert Card: Informação — trial termina em 7 dias, Badge: Aprovado (green/success), Badge: Ativo (emerald), Badge: Beta (secondary outline), Badge: Cancelado (muted), Badge Color Token: amber (warning/pending) (+43 more)

### Community 3 - "Admin API & Tests"
Cohesion: 0.06
Nodes (45): API Route: app/api/admin/orgs/[orgId]/integrations/route.ts, Tests for PATCH+GET /api/admin/orgs/[orgId]/integrations — PATCH: 403 non-superadmin, 403 null session, 400 invalid slug, 400 empty body, 422 private URL, 404 org not found, 409 slug conflict, 200 valid n8nSlug, 200 n8nBaseUrl only; GET: 403 non-superadmin, 404 org not found, 200 returns n8nSlug+n8nBaseUrl, API Route: app/api/admin/orgs/route.ts, Tests for POST /api/admin/orgs — covers: 403 non-superadmin, 403 null session, 400 missing name, 400 name too short, 400 invalid n8nSlug chars, 422 private n8nBaseUrl (SSRF), 409 n8nSlug conflict, 201 happy path with onboardingToken prefix, 201 explicit n8nSlug, token stored as hash (2 inserts), slug suffix increment, API Route: app/api/approvals/[id]/approve/route.ts, Tests for POST /api/approvals/[id]/approve — covers: 401 no session, 401 superadmin without org, 404 wrong org, 409 already resolved, 200 dispatches callback, no callback when callbackUrl null, decisionValues in callback, decisionValues null when absent, 422 invalid body type, resolvedBy null without email, callbackStatus=blocked SSRF, 422 required field missing, 200 required field provided, 422 decisionFields null ignored, callbackStatus=failed, files in callback payload, files=[] when no files, 200 on fetch timeout, GET /api/approvals/[id]/files/[fileId]/check — auth: organizationId required; validates approval belongs to org; validates file belongs to approval and org; calls objectExists(r2Key); returns {exists:true} 200 or {exists:false} 404; tables: approvals, approvalFiles, Tests for GET /api/approvals/[id]/files/[fileId]/check — covers: 401 no session, 401 no orgId, 404 approval not found, 404 file not found, 200 exists:true, 404 exists:false, correct r2Key passed to objectExists (+37 more)

### Community 4 - "Approval UI Components"
Cohesion: 0.06
Nodes (37): ApprovalCard — client component, inline approve/reject + file preview, ApprovalDetail — client component, full-width viewer + decision panel, ApprovalDetailPage — /approvals/[id] server component, ApprovalStatus — states: pending, approved, rejected, ApprovalsList — client component, filter + table, ApprovalsPage — /approvals server component, Auth user flow: register → onboarding/org-profile → dashboard, BillingPage — /billing server component (+29 more)

### Community 5 - "Auth & Database Migrations"
Cohesion: 0.07
Nodes (33): Credentials Provider (email+password), Google OAuth Provider, callbackUrl uses .test TLD to pass validateCallbackUrl without mock, db/migrations/, DrizzleAdapter for NextAuth, Integration Test: n8n callback fired with correct payload on approve/reject, Integration Test: GET files from another org returns 404 (multi-tenant isolation), Integration Test: Full rich approval flow (presign → create → GET files → approve → 409) (+25 more)

### Community 6 - "Project Config & Docs"
Cohesion: 0.06
Nodes (30): apps/web/AGENTS.md, apps/web/CLAUDE.md, Asaas (BR payments), coverage: app/api/admin/orgs/[orgId]/integrations/route.ts, coverage: app/api/admin/orgs/route.ts, coverage: app/api/approvals/[id]/approve/route.ts, coverage: app/api/approvals/[id]/files/route.ts, coverage/index.html (100% coverage) (+22 more)

### Community 7 - "Table Design Patterns"
Cohesion: 0.07
Nodes (29): Anti-pattern: Ação destrutiva diretamente na linha sem confirm dialog (forbidden), Anti-pattern: Tabela sem estado vazio definido (forbidden), Column: Ações — Ver button + ellipsis menu per row, Column: Data — sortable, date format DD/MM/YYYY, Column: Fluxo — sortable, flow/workflow name, Column: ID — sortable, font-mono text-xs text-muted-foreground, Column: Status — badge with Pendente/Aprovado/Rejeitado variants, Column: Título — title + subtitle (n8n reference) (+21 more)

### Community 8 - "Empty States & CTA UI"
Cohesion: 0.1
Nodes (25): CTA Button — + Criar fluxo no n8n (primary dark), CTA Button — Limpar filtros (secondary/ghost), CTA Button — Tentar novamente (retry with icon), Design System Navigation Sidebar, Dev-only warning badge — Apenas em desenvolvimento. Não indexado em prod., Empty State — Erro ao carregar (Load error with retry), Empty State — Sem dados ainda (No approvals found), Empty State — Sem permissão (Access restricted) (+17 more)

### Community 9 - "Brand Color System"
Cohesion: 0.1
Nodes (25): Anti-Pattern: Never use brand color for error — always bg-destructive or bg-red-*, Anti-Pattern: No hardcoded hex values in components, Anti-Pattern: Never invent color variants not mapped in this guide, Azul Marinho #0D1B4B (corrected from displayed #0D1B48), Azul Médio #1E2460, Azul Profundo #1E3080, Ciano Claro #5CCFF5, Ciano Elétrico #00AEEF (+17 more)

### Community 10 - "Navigation Patterns"
Cohesion: 0.1
Nodes (25): Breadcrumb Example — Admin > Organizações > Empresa ABC > Cobrança, Breadcrumb — Hierarquia Pattern, Design System Left Navigation — Section Index, Navigation Badge Count — Cyan pill showing pending item count, Nav Item — Aprovações (badge count 12), Nav Item — Cobrança, Nav Item — Configurações, Nav Item — Dashboard (active/selected state) (+17 more)

### Community 11 - "Database Schema"
Cohesion: 0.16
Nodes (20): DB Architecture Decisions (db/CLAUDE.md), Enum: approval_status (pending|approved|rejected), Enum: flow_status (running|success|error|waiting), Enum: member_role (owner|admin|member|viewer), Enum: subscription_status (active|trial|past_due|canceled|inactive), DB Migration Workflow (drizzle-kit generate → CI apply), Table: accounts, Table: approval_file_uploads (+12 more)

### Community 12 - "Typography System"
Cohesion: 0.11
Nodes (23): CSS var --font-barlow (h1–h6), CSS var --font-inter (body/labels/inputs), Barlow Font Family (headings), Inter Font Family (body), font-bold — 700 — Hero titles/critical highlights, font-medium — 500 — Labels/nav items active, font-normal — 400 — Body/descriptions, font-semibold — 600 — Headings/buttons/CTAs (+15 more)

### Community 13 - "Loading States"
Cohesion: 0.15
Nodes (23): Loading de Página Completa — centered Loader2 spinner with context message, Full-page loading shape: large cyan Loader2 spinner centered vertically + 'Carregando aprovações...' text below, Rule: Operations >300ms must show skeleton or spinner, Rule: long-running spinner must show context message (anti-pattern: spinner without message), Rule: Never leave area blank during loading, Loading Rules section — do/don't checklist, Loading States — Design System Page, Skeleton uses animate-pulse bg-muted Tailwind classes (+15 more)

### Community 14 - "Design System Overview"
Cohesion: 0.16
Nodes (22): Pruma IA Brand Identity, Dev-only Guard — Not accessible in production, Pruma IA Design System — Index Page, design-system/MASTER.md reference spec, Design System Sidebar Navigation, Tokens Rápidos — Quick Tokens Section, Section: Badges & Status — Status de aprovação, assinatura, tags de fluxo, Section: Botões — Variantes, tamanhos, estados (hover, focus, loading, disabled) (+14 more)

### Community 15 - "Member Management CRUD"
Cohesion: 0.11
Nodes (22): Admin Role Badge, Remover Destructive Action Button (red/danger variant), Detail Section — Dados do Membro (name, role, email, join date), Detail Page — Visualização, Detail Section — Atividades Recentes (approval events, config changes), Form Actions Bar — Enviar Convite + Cancelar buttons, Form Page — Criar / Editar, Função Role Select Dropdown Field (+14 more)

### Community 16 - "R2 Storage Layer"
Cohesion: 0.15
Nodes (16): GET(), GET(), buildR2Key(), deleteObject(), getClient(), objectExists(), presignReadUrl(), presignUploadUrl() (+8 more)

### Community 17 - "Asaas Billing & Webhooks"
Cohesion: 0.1
Nodes (21): Asaas event→subscriptionStatus mapping: PAYMENT_CONFIRMED/RECEIVED→active, PAYMENT_OVERDUE→past_due, SUBSCRIPTION_DELETED/PAYMENT_DELETED→canceled, Asaas webhook auth: timing-safe compare of asaas-access-token header against ASAAS_WEBHOOK_TOKEN env var, Design preview badges: approval status (amber/emerald/red), subscription status (trial/active/past_due/canceled/inactive), dot badges, special tags, Design preview buttons: variants (default/secondary/outline/ghost/destructive/link), sizes (xs/sm/default/lg/icon/icon-sm/icon-xs), loading/disabled states, Design preview cards: metric cards, item list cards, content/detail card, info/alert cards, Design preview colors: brand palette (Azul Marinho #0D1B4B, Ciano Elétrico #00AEEF, Ciano Pálido #E0F6FE), semantic tokens, status colors, anti-patterns, Design preview CRUD pattern: List Page (table+toolbar+pagination), Form Page (card form+breadcrumb), Detail Page (info grid+activity log), Design preview empty states: no data, no search results, no permission, error with retry, in-table empty (+13 more)

### Community 18 - "Modal Design Patterns"
Cohesion: 0.14
Nodes (21): Anatomia Confirmação Destrutiva — Section showing destructive modal anatomy breakdown, Anatomia Modal Padrão — Section showing standard modal anatomy breakdown, Modal Body — Content/Description Area, Cancelar — Cancel/Secondary Action Button (left-aligned in footer), Close Button — X icon in modal header (top-right corner), Confirmar — Primary Confirm Button (right-aligned, dark/navy background), Excluir permanentemente — Destructive Action Button (red background), Confirmation Text Input — Type EXCLUIR to confirm destructive action (+13 more)

### Community 19 - "Form Input Patterns"
Cohesion: 0.13
Nodes (19): Semantic autoComplete on Auth Fields, Complete Form Example with Multiple Fields, Disabled Input State, Error Message Below Field — Red with Warning Icon, Input Error State, Form Action Buttons — Primary Save + Secondary Cancel, Inputs & Forms Design System Section, Helper Text Below Input (+11 more)

### Community 20 - "Button Design System"
Cohesion: 0.13
Nodes (18): Button Size: Default, Button Size: Extra Small, Button Size: icon / icon-sm / icon-xs, Button Size: Large, Button Size: Small, Button State: Disabled, Button State: Loading (disabled + Loader2 animate-spin), Button Usage Rules (+10 more)

### Community 21 - "Coverage Report Utils A"
Cohesion: 0.27
Nodes (11): addSortIndicators(), enableUI(), getNthColumn(), getTable(), getTableBody(), getTableHeader(), loadColumns(), loadData() (+3 more)

### Community 22 - "Coverage Sort Utils"
Cohesion: 0.27
Nodes (11): addSortIndicators(), enableUI(), getNthColumn(), getTable(), getTableBody(), getTableHeader(), loadColumns(), loadData() (+3 more)

### Community 23 - "n8n Integration Layer"
Cohesion: 0.2
Nodes (14): db: drizzle-orm client — drizzlePg (node-postgres Pool) for localhost, drizzleNeon (neon-http) for Neon prod; DATABASE_URL with placeholder fallback, N8nCallbackPayload {approvalId, status, resolvedBy, comment?, decisionValues?, resolvedAt, files[{r2Key, filename, mimeType, sizeBytes}], retried?}, dispatchCallback(callbackUrl, payload) → 'sent'|'failed'|'blocked'; 5s AbortSignal timeout; SSRF guard, n8n.test.ts: tests verifyN8nSecret (timing-safe), validateCallbackUrl (SSRF blocklist), dispatchCallback (blocked/sent/failed/timeout), validateCallbackUrl(url): blocks localhost, 127.x, 10.x, 172.16-31.x, 192.168.x, ::1, ULA fc/fd, ::ffff:, 169.254.x, 0.0.0.0; only http/https, verifyN8nSecret(req): uses timingSafeEqual on x-n8n-secret header vs N8N_WEBHOOK_SECRET env, ALLOWED_MIME_TYPES: pdf, jpeg, png, webp, gif, docx, xlsx, xml, csv, plain, zip, buildR2Key(orgId, filename) → '{orgId}/{uuid}/{safe_filename}' (uuid random, filename sanitized to 100 chars) (+6 more)

### Community 24 - "Billing Checkout Flow"
Cohesion: 0.2
Nodes (12): Card Form — complete profile state with fields: Nome no cartão, Número do cartão, Mês, Ano, CVV, Billing Checkout Modal — Assinar plano Pro R$990/mês, Error state (empty fields) — Preencha todos os dados do cartão corretamente. with Fechar and Tentar novamente buttons, Error state (charge failed) — Dados do cartão inválidos. with Fechar and Tentar novamente buttons, Form field: Número do cartão (required, placeholder 0000 0000 0000 0000), Form field: Nome no cartão (required, placeholder JOÃO A SILVA), Form field: CVV (required, placeholder 000), Form field: Mês (required, placeholder MM) (+4 more)

### Community 25 - "Coverage Block Nav A"
Cohesion: 0.35
Nodes (8): a(), B(), D(), g(), i(), k(), Q(), y()

### Community 26 - "Coverage Prettify Utils"
Cohesion: 0.35
Nodes (8): a(), B(), D(), g(), i(), k(), Q(), y()

### Community 27 - "Email Notification System"
Cohesion: 0.31
Nodes (9): isEmailRateLimited(), POST(), buildApprovalNotificationHtml(), buildPasswordResetHtml(), escapeHtml(), getTransporter(), sendApprovalNotificationEmail(), sendEmail() (+1 more)

### Community 28 - "Brazilian Address Utils"
Cohesion: 0.24
Nodes (4): formatCnpj(), handleCnpjChange(), handleSubmit(), validateCnpj()

### Community 29 - "Auth & Admin Layout"
Cohesion: 0.2
Nodes (11): Admin Layout — (admin)/layout.tsx, Root Page — app/page.tsx (redirect dispatcher), Auth Page — /forgot-password, Admin Guard — /admin requires isSuperAdmin, Design Preview Guard — 404 in production, proxy.ts — Next.js 16 middleware, Onboarding Guard — user without org redirected to /onboarding, Rate Limiter — in-memory Map per instance (+3 more)

### Community 30 - "Asaas API Client"
Cohesion: 0.22
Nodes (11): Asaas API Client (asaas object), AsaasCustomer interface {id, name, email, cpfCnpj?}, asaas.customers.create(name, email, cpfCnpj?) → POST /customers, asaas.customers.find(email) → GET /customers?email=..., asaas.paymentLinks.create({name, value, billingType, chargeType: RECURRENT|INSTALLMENT|DETACHED, subscriptionCycle?}) → POST /paymentLinks → {id, url}, asaasRequest<T>(path, options): generic fetch wrapper with access_token header, throws on non-ok, AsaasSubscription interface {id, customer, billingType, value, nextDueDate, status, cycle}, asaas.subscriptions.cancel(id) → DELETE /subscriptions/{id} (+3 more)

### Community 31 - "File Check Utilities"
Cohesion: 0.33
Nodes (7): checkPdf(), fetchCsv(), fetchDocx(), fetchXlsx(), fetchXml(), loadFiles(), selectFile()

### Community 32 - "Shared UI Components"
Cohesion: 0.22
Nodes (9): Button component: variants=default|outline|secondary|ghost|destructive|link; sizes=default|xs|sm|lg|icon|icon-xs|icon-sm|icon-lg; built on @base-ui/react/button + cva, Sidebar component: nav links (dashboard, flows, approvals, members, billing, settings, profile), superadmin section, user avatar+name, signOut, Design preview /inputs: shows input states (normal, helper, error/aria-invalid, disabled, password toggle, search), select, textarea, full form example; accessibility rules, Design preview /loading: Skeleton component (animate-pulse bg-muted) for cards/table/forms, Loader2 animate-spin spinners in buttons, Design preview /modals: Modal component with ESC+scrim+X close, role=dialog aria-modal, standard/form/destructive variants; anatomical previews, Design preview /tables: full table with toolbar (search+filter), sortable columns, status badges, inline actions, pagination, Sidebar nav: /dashboard, /flows, /approvals, /settings/members, /billing, /settings, /settings/profile; admin: /admin, cn(...inputs): clsx + twMerge utility for conditional Tailwind class merging (+1 more)

### Community 33 - "Admin Org Sub-pages"
Cohesion: 0.29
Nodes (8): Admin Org Approvals — /admin/orgs/[orgId]/approvals, Admin Org Billing — /admin/orgs/[orgId]/billing, Admin Org Dashboard — /admin/orgs/[orgId], Admin Org Flows — /admin/orgs/[orgId]/flows, Admin Org Integrations — /admin/orgs/[orgId]/integrations, Admin Org Layout — /admin/orgs/[orgId]/layout.tsx, Business Rule — n8nSlug is immutable org identifier, Business Rule — Superadmin panel is read-only

### Community 35 - "Legal & LGPD Pages"
Cohesion: 0.6
Nodes (6): CookiesPage — Cookie Notice; LGPD art.7 V basis for necessary cookies; analytics/marketing require explicit consent; DRAFT — pending legal review, DpaPage — Data Processing Agreement; roles: Client=Controller, Pruma=Operator; suboperators: Neon, Vercel, Cloudflare R2, Asaas, Google, Resend, Meta; incident notification 24h to Controller/72h to ANPD; data deletion 30 days post-contract; DRAFT — pending legal review, LegalLayout — shared shell for all legal pages; nav links: /privacy, /terms, /dpa, /cookies; contact: privacidade@pruma.io, PrivacyPage — Privacy Policy; LGPD compliance; collects: name, email, CPF, role, company, IP/logs; DPO: privacidade@pruma.io; placeholders [CNPJ] [ENDEREÇO] [NOME DO DPO] pending; DRAFT — pending legal review, TermsPage — Terms of Use; SaaS license; LGPD DPA clause embedded (Client=Controller, Pruma=Operator); SLA 99.5%; liability cap = 3 months paid; jurisdiction: São Paulo-SP; DRAFT — pending legal review, LGPD compliance framework — legal basis per treatment purpose; DPO contact; 15-day response SLA for data subject rights; incident notification 24h/72h; data retention 5y fiscal / 12m logs

### Community 36 - "Coverage Block Nav B"
Cohesion: 0.7
Nodes (4): goToNext(), goToPrevious(), makeCurrent(), toggleClass()

### Community 37 - "Coverage Block Nav C"
Cohesion: 0.7
Nodes (4): goToNext(), goToPrevious(), makeCurrent(), toggleClass()

### Community 39 - "Theme Provider"
Cohesion: 0.5
Nodes (2): getSystemTheme(), resolveTheme()

### Community 40 - "n8n Flows Webhook"
Cohesion: 0.5
Nodes (5): Auto-register n8nBaseUrl on org if payload includes it and org has none set, Flow upsert idempotency: n8nExecutionId unique constraint prevents duplicate flowRuns on webhook retry, POST /api/n8n/flows — upsert flow + flowRun from n8n webhook, Unit tests for POST /api/n8n/flows, Org lookup: resolve organizationSlug against n8nSlug first, fallback to slug (URL slug)

### Community 45 - "Business Rules Docs"
Cohesion: 0.5
Nodes (4): src/app/CLAUDE.md — Business Rules & Architecture Decisions, Design System — Badge Component Spec, Design System — Empty State Component Spec, Design System — Form/Input Component Spec

### Community 46 - "File Upload Business Rules"
Cohesion: 0.5
Nodes (4): Business Rule — Approval file uploads via presigned R2 URL, Business Rule — n8nExecutionId unique constraint for idempotency, Script — seed-dev.ts (approval rich data seed), Tech Debt — Retry-failed-callbacks cron removed (Vercel free tier)

### Community 47 - "Onboarding Token Flow"
Cohesion: 0.5
Nodes (4): Onboarding token validation: must start with 'pruma_ot_'; stored as SHA-256 hash; single-use (usedAt); expires, Onboarding token GET response: organizationSlug (n8nSlug??slug), n8nSecret, apiUrl — consumed by pruma-deploy-kit make setup, GET /api/onboarding/[token] — validate onboarding token, return org credentials, onboardingTokens DB table — tokenHash (SHA-256), expiresAt, usedAt, organizationId

### Community 48 - "Brand Assets"
Cohesion: 0.5
Nodes (4): Framework Default Assets (Next.js/Vercel SVGs: vercel.svg, next.svg, globe.svg, window.svg, file.svg), Pruma IA App Icon (SVG), Pruma IA Brand Logo (Dark), Pruma IA Brand Logo (White/Light Background Variant)

### Community 61 - "Password Change Route"
Cohesion: 0.67
Nodes (3): Password change: verify currentPassword with bcrypt; enforce strong password policy (min 8, upper, lower, digit, special); hash with cost 12, Guard: accounts without password (OAuth-only) cannot use change-password route, PATCH /api/user/password — change user password (bcrypt verify + hash)

### Community 62 - "E2E Design Preview Tests"
Cohesion: 0.67
Nodes (3): Design Preview Sections: index, colors, typography, buttons, badges, inputs, cards, tables, modals, empty-states, loading, navigation, crud, Playwright E2E — Design Preview visual capture spec, E2E Screenshot Output Directory: tests/e2e/screenshots/design-preview

### Community 105 - "Component Group 105"
Cohesion: 1.0
Nodes (1): tests/e2e/

### Community 106 - "Component Group 106"
Cohesion: 1.0
Nodes (1): securityHeaders

### Community 107 - "Component Group 107"
Cohesion: 1.0
Nodes (2): Script — baseline-db.ts (one-time migration baseline), Script — migrate.ts (Drizzle migrations runner)

### Community 108 - "Component Group 108"
Cohesion: 1.0
Nodes (2): Header component: page title + theme toggle (dark/light via ThemeProvider) + bell notification button, ThemeProvider: React context for light/dark/system theme; persists to localStorage; listens to prefers-color-scheme media query

### Community 109 - "Component Group 109"
Cohesion: 1.0
Nodes (2): OrgProfileForm: fields cnpj (required+validated), phone, addressZipCode (CEP auto-fill via ViaCEP), addressStreet (required), addressNumber (required), addressComplement (optional), addressCity (required), addressState (required); PATCH /api/user/org-profile, ViaCEP API (https://viacep.com.br/ws/{cep}/json/) used in OrgProfileForm for address auto-fill; best-effort, errors swallowed

### Community 142 - "Component Group 142"
Cohesion: 1.0
Nodes (1): Script — seed-superadmin.ts

### Community 143 - "Component Group 143"
Cohesion: 1.0
Nodes (1): Root Layout — app/layout.tsx

### Community 144 - "Component Group 144"
Cohesion: 1.0
Nodes (1): Business Rule — callbackUrl dual SSRF validation

### Community 145 - "Component Group 145"
Cohesion: 1.0
Nodes (1): Business Rule — Email notifications are fire-and-forget

### Community 146 - "Component Group 146"
Cohesion: 1.0
Nodes (1): Admin Page — /admin (organization list)

### Community 147 - "Component Group 147"
Cohesion: 1.0
Nodes (1): Auth Layout — (auth)/layout.tsx

### Community 148 - "Component Group 148"
Cohesion: 1.0
Nodes (1): Dashboard NotFound — 404 page inside dashboard group

### Community 149 - "Component Group 149"
Cohesion: 1.0
Nodes (1): Auth user flow: login → /dashboard

### Community 150 - "Component Group 150"
Cohesion: 1.0
Nodes (1): NextAuth route handler — re-exports GET and POST from @/lib/auth handlers; delegates all auth to NextAuth v5

### Community 151 - "Component Group 151"
Cohesion: 1.0
Nodes (1): MAX_FILE_SIZE_BYTES = 10MB

### Community 152 - "Component Group 152"
Cohesion: 1.0
Nodes (1): Design preview /navigation: sidebar with active state, tabs for sub-navigation, breadcrumb, page header patterns

### Community 153 - "Component Group 153"
Cohesion: 1.0
Nodes (1): Design preview /typography: Barlow (font-heading h1-h6) + Inter (font-sans body); scale text-xs to text-4xl; font-weights 400-700; text color hierarchy

### Community 154 - "Component Group 154"
Cohesion: 1.0
Nodes (1): Design System Colors Page

## Ambiguous Edges - Review These
- `Business Rule — Multi-tenant isolation: filter by organizationId` → `Auth Page — /forgot-password`  [AMBIGUOUS]
  apps/web/src/app/(auth)/forgot-password/page.tsx · relation: unrelated_to
- `TermsAcceptanceModal — shown in dashboard layout when acceptedTermsAt is null` → `sendApprovalNotificationEmail(to, {approvalId, title, flowName?, description?, filenames?}): MJML template, links to /approvals/{id}`  [AMBIGUOUS]
  apps/web/src/components/auth/terms-acceptance-modal.tsx · relation: unrelated_but_lgpd_compliance_trigger

## Knowledge Gaps
- **296 isolated node(s):** `@tailwindcss/postcss`, `tests/integration/`, `tests/integration/env.ts`, `tests/e2e/`, `db/migrations/` (+291 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Theme Provider`** (5 nodes): `getSystemTheme()`, `resolveTheme()`, `ThemeProvider()`, `useTheme()`, `theme-provider.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component Group 105`** (2 nodes): `tests/e2e/`, `playwright.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component Group 106`** (2 nodes): `next.config.ts`, `securityHeaders`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component Group 107`** (2 nodes): `Script — baseline-db.ts (one-time migration baseline)`, `Script — migrate.ts (Drizzle migrations runner)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component Group 108`** (2 nodes): `Header component: page title + theme toggle (dark/light via ThemeProvider) + bell notification button`, `ThemeProvider: React context for light/dark/system theme; persists to localStorage; listens to prefers-color-scheme media query`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component Group 109`** (2 nodes): `OrgProfileForm: fields cnpj (required+validated), phone, addressZipCode (CEP auto-fill via ViaCEP), addressStreet (required), addressNumber (required), addressComplement (optional), addressCity (required), addressState (required); PATCH /api/user/org-profile`, `ViaCEP API (https://viacep.com.br/ws/{cep}/json/) used in OrgProfileForm for address auto-fill; best-effort, errors swallowed`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component Group 142`** (1 nodes): `Script — seed-superadmin.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component Group 143`** (1 nodes): `Root Layout — app/layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component Group 144`** (1 nodes): `Business Rule — callbackUrl dual SSRF validation`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component Group 145`** (1 nodes): `Business Rule — Email notifications are fire-and-forget`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component Group 146`** (1 nodes): `Admin Page — /admin (organization list)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component Group 147`** (1 nodes): `Auth Layout — (auth)/layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component Group 148`** (1 nodes): `Dashboard NotFound — 404 page inside dashboard group`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component Group 149`** (1 nodes): `Auth user flow: login → /dashboard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component Group 150`** (1 nodes): `NextAuth route handler — re-exports GET and POST from @/lib/auth handlers; delegates all auth to NextAuth v5`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component Group 151`** (1 nodes): `MAX_FILE_SIZE_BYTES = 10MB`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component Group 152`** (1 nodes): `Design preview /navigation: sidebar with active state, tabs for sub-navigation, breadcrumb, page header patterns`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component Group 153`** (1 nodes): `Design preview /typography: Barlow (font-heading h1-h6) + Inter (font-sans body); scale text-xs to text-4xl; font-weights 400-700; text color hierarchy`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Component Group 154`** (1 nodes): `Design System Colors Page`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Business Rule — Multi-tenant isolation: filter by organizationId` and `Auth Page — /forgot-password`?**
  _Edge tagged AMBIGUOUS (relation: unrelated_to) - confidence is low._
- **What is the exact relationship between `TermsAcceptanceModal — shown in dashboard layout when acceptedTermsAt is null` and `sendApprovalNotificationEmail(to, {approvalId, title, flowName?, description?, filenames?}): MJML template, links to /approvals/{id}`?**
  _Edge tagged AMBIGUOUS (relation: unrelated_but_lgpd_compliance_trigger) - confidence is low._
- **Why does `Drizzle ORM` connect `API Routes Hub` to `Auth & Database Migrations`, `Project Config & Docs`, `Database Schema`, `R2 Storage Layer`, `Email Notification System`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `db/schema.ts` connect `Approval API Coverage` to `Auth & Database Migrations`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `Library: @/lib/r2 (Cloudflare R2 storage client)` connect `Admin API & Tests` to `Approval API Coverage`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `API Route: /api/n8n/approvals` (e.g. with `External Integration: n8n (workflow automation — webhooks and callbacks)` and `n8n Webhook Integration: flows + approvals ingest`) actually correct?**
  _`API Route: /api/n8n/approvals` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@tailwindcss/postcss`, `tests/integration/`, `tests/integration/env.ts` to the rest of the system?**
  _296 weakly-connected nodes found - possible documentation gaps or missing edges._