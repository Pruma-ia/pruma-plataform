# PRD — Configurações da Organização

**Status:** 📋 Pronto para dev | **Prioridade:** P1 | **Esforço estimado:** S (2 dias) | **RICE Score:** 250

---

## Problema

Owner não consegue alterar nome, logo ou slug da org após criação. Empresa que faz rebranding precisa acionar suporte. Falta a tela mais básica de qualquer SaaS B2B.

---

## Solução

Página `/settings/organization` para owner/admin editar dados públicos da org.

---

## Escopo

**Dentro:**
- Editar nome da organização
- Upload de logo (armazenada no R2, mesma infra de attachments)
- Visualizar slug (read-only — slug muda quebra integrações n8n)
- Editar dados cadastrais (CNPJ, telefone, endereço) — integrado com PRD onboarding

**Fora:**
- Alterar slug (exige migração de webhooks n8n — escopo separado)
- Alterar n8nSlug (superadmin only — intencional)
- Deletar organização (escopo separado)
- Transferir ownership

---

## Fluxo do usuário

```
/settings → aba "Organização"
→ formulário: nome, logo, dados cadastrais
→ salvar → toast de sucesso
→ nome atualizado reflete na sidebar imediatamente
```

---

## Requisitos técnicos

| Item | Status |
|---|---|
| `GET /api/user/org-profile` — já previsto no PRD onboarding | ❌ Falta |
| `PATCH /api/user/org-profile` — owner/admin only | ❌ Falta |
| Upload logo → R2 com presigned URL (mesmo fluxo de attachments) | ❌ Falta |
| Página `/settings/organization` | ❌ Falta |
| `logo` já existe em `organizations.logo` — apenas usar | ✅ Existe |

---

## Métricas de sucesso

- Tickets de "quero mudar o nome da empresa": zero

---

## Riscos

| Risco | Mitigação |
|---|---|
| Membro (não owner) tenta editar | Verificar role owner/admin no servidor |
| Logo muito grande | Limitar a 2MB, aceitar PNG/JPG/SVG |

---

## Dependências

- PRD Onboarding + Dados Cadastrais (`onboarding-org-dados-cadastrais.md`) — compartilham API
- R2 já configurado em prod
