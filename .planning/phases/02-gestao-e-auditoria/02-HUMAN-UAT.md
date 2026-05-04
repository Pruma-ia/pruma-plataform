---
status: partial
phase: 02-gestao-e-auditoria
source: [02-VERIFICATION.md]
started: 2026-05-04T08:45:00.000Z
updated: 2026-05-04T08:45:00.000Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Approvals filter/search/pagination/export UI

expected: Status dropdown filters table; search bar debounces and updates URL; "Anterior"/"Próxima" pagination works; "Exportar CSV" downloads a valid file with correct columns and org-scoped rows
result: [pending]

### 2. CNPJ cadastral gate flow

expected: User without CNPJ is redirected to /onboarding/cadastral (dark theme); form saves all 8 cadastral fields; JWT refreshes (orgCnpjFilled=true); no redirect loop back to cadastral
result: [pending]

### 3. Approval timeline UI

expected: Approval detail page shows "Histórico de decisão" section; events render with icon, label, actor name, timestamp; after opening the page a second time, an `approval_viewed` event appears in the timeline
result: [pending]

### 4. Flows runs table

expected: /flows/[id] shows a runs table with 5 columns (etapas count, approvals count, duration, status, date); etapas count comes from n8n JSONB payload; duration labels are human-readable (e.g. "2m 34s"); status badge renders color correctly
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
