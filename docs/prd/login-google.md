# PRD — Login com Google

**Status:** 📋 Pronto para dev | **Prioridade:** P0 | **Esforço estimado:** S (2–3 dias) | **RICE Score:** 666

---

## Problema

Usuários novos abandonam o cadastro por causa do atrito de criar senha. Produtos B2B SaaS com login social convertem ~30% mais no onboarding. Pruma só oferece credentials hoje.

---

## Solução

Habilitar o provider Google já configurado em `apps/web/src/lib/auth.ts`. Usuário clica "Entrar com Google", autentica via OAuth 2.0, e entra direto no dashboard.

---

## Escopo

**Dentro:**
- Botão "Continuar com Google" na página `/login`
- Botão "Continuar com Google" na página `/register`
- Criação automática de conta se email não existe
- Redirecionamento pós-login para `/dashboard`
- Variáveis `AUTH_GOOGLE_ID` e `AUTH_GOOGLE_SECRET` configuradas no Vercel

**Fora:**
- Vinculação de conta Google com conta credentials existente (mesmo email)
- Login com Microsoft, GitHub ou outros providers
- Avatar do Google sobrescrevendo foto de perfil customizada

---

## Fluxo do usuário

```
/login → clica "Continuar com Google"
       → popup Google OAuth
       → autoriza
       → NextAuth cria/recupera user no DB
       → JWT gerado com organizationId + role
       → redirect /dashboard
```

**Caso especial:** usuário Google sem organização → redirect `/onboarding` (mesmo fluxo de registro normal).

---

## Requisitos técnicos

| Item | Status |
|---|---|
| Provider Google em `auth.ts` (linha 23) | ✅ Pronto |
| DrizzleAdapter com tabela `accounts` | ✅ Pronto |
| Env vars `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | ❌ Falta |
| Google Cloud Console — OAuth app configurado | ❌ Falta |
| Botão Google no `/login` | ❌ Falta |
| Botão Google no `/register` | ❌ Falta |
| Redirect URI autorizado no Google Console | ❌ Falta |

---

## Métricas de sucesso

- Taxa de conversão no cadastro: +20% em 30 dias
- Tempo médio de onboarding: redução de ~2 min → ~30 seg
- Erros de autenticação Google: 0 nas primeiras 2 semanas

---

## Riscos

| Risco | Mitigação |
|---|---|
| Usuário com mesmo email no credentials + Google | Bloquear na UI: "Conta criada com senha. Use email/senha." |
| `AUTH_GOOGLE_SECRET` vazar em logs | Nunca logar — já tratado pelo NextAuth |
| Redirect URI incorreto no Google Console | Testar local + staging antes de prod |

---

## Dependências

- Google Cloud Console: criar OAuth 2.0 Client ID
- Vercel: setar env vars em prod + preview
- Design: botão seguindo Google Brand Guidelines
