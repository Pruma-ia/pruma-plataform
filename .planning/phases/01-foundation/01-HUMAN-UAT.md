---
status: partial
phase: 01-foundation
source: [01-VERIFICATION.md]
started: 2026-05-02T00:00:00Z
updated: 2026-05-02T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. OTP end-to-end flow
expected: Usuário novo registra, recebe email OTP no Mailpit, insere código na página /verify-email, é redirecionado para o dashboard com sessão verificada. Reenvio funciona com cooldown de 60s visível.
result: [pending]

### 2. Checklist state progression in browser
expected: Org nova vê checklist com passos pendentes. Ao completar cada ação (criar flow, criar aprovação, clicar link WhatsApp), o item correspondente é marcado automaticamente. Quando todos os itens estão marcados, o checklist desaparece da dashboard.
result: [pending]

### 3. Logo upload + header propagation
expected: Owner da org faz upload de logo PNG/JPG/WebP (≤2MB) na página de configurações. Após salvar, o logo aparece no header de todas as páginas do dashboard imediatamente. Upload acima de 2MB ou tipo inválido é rejeitado com mensagem de erro.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
