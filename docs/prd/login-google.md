# PRD — Login com Google

**Status:** 🚧 Em desenvolvimento | **Prioridade:** P0 | **Esforço estimado:** S (2–3 dias) | **RICE Score:** 666

---

## Problema

Usuários novos abandonam o cadastro por causa do atrito de criar senha. Produtos B2B SaaS com login social convertem ~30% mais no onboarding. Pruma só oferece credentials hoje.

---

## Solução

Habilitar o provider Google já configurado em `apps/web/src/lib/auth.ts`. Usuário clica "Entrar com Google", autentica via OAuth 2.0, e entra direto no dashboard.

---

## Escopo

**Dentro:**
- Botão "Continuar com Google" na página `/login` *(já existia no código, descoberto na impl.)*
- Botão "Continuar com Google" na página `/register`
- Criação automática de conta se email não existe (DrizzleAdapter)
- Redirecionamento pós-login para `/dashboard`
- Variáveis `AUTH_GOOGLE_ID` e `AUTH_GOOGLE_SECRET` configuradas no Vercel
- **[Descoberto]** Fluxo de onboarding para usuário Google sem organização: página `/onboarding` onde usuário nomeia a empresa antes de acessar o dashboard

**Fora:**
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

**Caso especial — usuário Google novo (sem organização):**
```
OAuth autoriza → sem org no JWT → proxy redireciona /onboarding
              → usuário informa nome da empresa
              → org criada → reload → JWT carrega membership → /dashboard
```

---

## Requisitos técnicos

| Item | Status |
|---|---|
| Provider Google em `auth.ts` (linha 23) | ✅ Pronto |
| DrizzleAdapter com tabela `accounts` | ✅ Pronto |
| Env vars `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | ✅ Pronto |
| Google Cloud Console — OAuth app configurado | ✅ Pronto |
| Botão Google no `/login` | ✅ Pronto |
| Botão Google no `/register` | ✅ Pronto |
| Redirect URI autorizado no Google Console | ✅ Pronto |
| Página `/onboarding` para usuário Google sem org | ✅ Pronto |
| Guard no proxy — auth sem org → `/onboarding` | ✅ Pronto |

---

## Métricas de sucesso

- Taxa de conversão no cadastro: +20% em 30 dias
- Tempo médio de onboarding: redução de ~2 min → ~30 seg
- Erros de autenticação Google: 0 nas primeiras 2 semanas

---

## Riscos

| Risco | Mitigação |
|---|---|
| Usuário com mesmo email no credentials + Google | `allowDangerousEmailAccountLinking` — link automático pelo email verificado pelo Google |
| `AUTH_GOOGLE_SECRET` vazar em logs | Nunca logar — já tratado pelo NextAuth |
| Redirect URI incorreto no Google Console | Testar local + staging antes de prod |

---

## Dependências

- Google Cloud Console: criar OAuth 2.0 Client ID
- Vercel: setar env vars em prod + preview
- Design: botão seguindo Google Brand Guidelines
