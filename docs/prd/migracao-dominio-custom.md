# PRD — Migração para Domínio Próprio

**Status:** 📋 Pronto para dev | **Prioridade:** P1 | **Esforço estimado:** S (1–2 dias) | **RICE Score:** 240

---

## Problema

App rodando no domínio temporário Vercel. Impactos:
- URL de callback enviada ao `pruma-deploy-kit` dos clientes aponta para domínio não-definitivo
- Política de privacidade (LGPD) precisa de URL definitiva para publicar
- Branding não-profissional para clientes B2B

---

## Solução

Migrar para domínio próprio (`app.pruma.ai` ou `app.pruma.com.br`) com redirect 301 do domínio Vercel por 30 dias para não quebrar clientes n8n existentes.

**Decisão de domínio: `pruma.io`** (~R$176/ano primeiro ano, renovação ~R$370/ano)
Padrão SaaS B2B global. Credibilidade enterprise sem custo premium do `.ai`.

---

## Escopo

**Dentro:**
- Configurar domínio custom no Vercel (CNAME ou A record)
- Atualizar `NEXTAUTH_URL` no Vercel env (prod + preview)
- Atualizar `NEXT_PUBLIC_APP_URL` no Vercel env
- Adicionar redirect URI no Google Cloud Console para OAuth
- Atualizar URL de webhook no painel Asaas
- Remover hardcoded `https://app.pruma.ia` do código → usar `process.env.NEXTAUTH_URL`
- Manter domínio Vercel ativo com redirect 301 por 30 dias (proteção clientes n8n)

**Fora:**
- Migração de e-mails (domínio de email é separado)
- Certificado SSL (Vercel gerencia automaticamente)

---

## Arquivos com hardcoded a corrigir

| Arquivo | Linha | Fix |
|---|---|---|
| `src/app/api/onboarding/[token]/route.ts` | 55 | Remover fallback hardcoded — NEXTAUTH_URL é obrigatório |
| `src/app/(admin)/admin/orgs/[orgId]/integrations/page.tsx` | 108, 119 | Usar `process.env.NEXT_PUBLIC_APP_URL` |

---

## Checklist de execução

1. [ ] Decidir domínio (pruma.ai vs pruma.com.br)
2. [ ] Comprar domínio no registrar
3. [ ] Adicionar domínio no Vercel → configurar DNS
4. [ ] Atualizar env vars no Vercel: `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`
5. [ ] Google Cloud Console → OAuth → Authorized redirect URIs → adicionar `https://app.pruma.io/api/auth/callback/google`
6. [ ] Asaas dashboard → Webhooks → atualizar URL para `https://app.pruma.io/api/webhooks/asaas`
7. [ ] PR: remover hardcoded URLs do código
8. [ ] Configurar redirect 301 do domínio Vercel → novo domínio (30 dias)
9. [ ] Testar login Google, aprovação, webhook Asaas no novo domínio

---

## Riscos

| Risco | Mitigação |
|---|---|
| Clientes n8n com prumaApiUrl antiga quebram callbacks | Redirect 301 do domínio Vercel por 30 dias |
| Google OAuth rejeita redirect para novo domínio | Adicionar AMBOS domínios no Google Console antes de trocar |
| Asaas webhook para de funcionar | Atualizar Asaas antes de desativar domínio antigo |
| NEXTAUTH_URL errada → sessão quebra | Testar login end-to-end antes de publicar para clientes |

---

## Dependências

- Decisão do domínio (pruma.ai vs pruma.com.br) — decisão de negócio
- Acesso ao registrar DNS
- Acesso ao Google Cloud Console (OAuth app)
- Acesso ao painel Asaas (webhook config)
- PRD Compliance LGPD: URL definitiva é pré-requisito para publicar política de privacidade
