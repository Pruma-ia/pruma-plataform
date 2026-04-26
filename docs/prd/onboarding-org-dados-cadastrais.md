# PRD — Onboarding Melhorado + Dados Cadastrais da Org

**Status:** 📋 Pronto para dev | **Prioridade:** P1 | **Esforço estimado:** L (6–8 dias) | **RICE Score:** 220

---

## Problema

Onboarding atual coleta só o nome da organização. CNPJ, telefone e endereço são exigidos pelo Asaas no momento da assinatura — mas não existem no schema e não são armazenados. Resultado:

1. Usuário precisa redigitar dados cadastrais a cada tentativa de assinar.
2. Asaas cria clientes com perfil incompleto → risco de falha na cobrança / chargeback.
3. Sem CNPJ salvo, não é possível emitir NF ou fazer compliance fiscal futuro.
4. Owner que esquece de assinar no primeiro acesso não tem caminho claro de retornar ao billing.

---

## Solução

Coletar dados cadastrais da org em **etapa dedicada logo após a criação**, armazená-los no schema, e pré-preencher o formulário de billing automaticamente.

Fluxo target:

```
/register ou Google → org criada (nome) → /onboarding/org-profile (CNPJ, endereço, telefone)
                                                     ↓
                                          /dashboard (trial ativo)
                                                     ↓
                         /billing → checkout pré-preenchido com dados da org
```

---

## Escopo

**Dentro:**
- Novos campos no schema `organizations`: `cnpj`, `phone`, `addressStreet`, `addressNumber`, `addressComplement`, `addressZipCode`, `addressCity`, `addressState`
- Step 2 do onboarding: `/onboarding/org-profile` — formulário pós-criação de org
- CEP com auto-preenchimento via ViaCEP (gratuito, sem auth)
- `GET /api/user/org-profile` — retorna dados cadastrais da org do usuário logado
- `PATCH /api/user/org-profile` — atualiza campos cadastrais (owner/admin only)
- `/settings/organization` — página para editar dados da org depois do onboarding
- Billing checkout (`/api/billing/checkout`) lê dados da org para pré-preencher; `holderInfo` no body vira opcional se org tiver dados completos
- Indicador visual no billing ("dados incompletos — preencha para assinar")

**Fora:**
- Validação de CNPJ na Receita Federal (escopo separado — pode usar serviço pago)
- Upload de documentos da empresa
- Múltiplos endereços / filiais
- Troca de plano / downgrade (escopo billing)
- Campos específicos para PF (CPF) — v1 assume PJ

---

## Fluxo do usuário

### Novo cliente (credentials ou Google)
```
1. /register ou OAuth → org criada com nome
2. Redirect automático → /onboarding/org-profile
3. Formulário: CNPJ, telefone, CEP → auto-fill endereço via ViaCEP → complemento + número
4. Salvar → /dashboard (trial)
5. Banner no dashboard: "Complete seus dados para assinar" (se dados ainda incompletos)
```

### Owner já existente (dados faltando)
```
/settings/organization → mesmos campos → salvar
```

### Checkout de assinatura
```
/billing → "Assinar" → formulário de cartão/PIX
         → campos CNPJ / endereço pré-preenchidos da org
         → se incompletos → link direto "Completar dados em Configurações"
```

---

## Requisitos técnicos

| Item | Status |
|---|---|
| Migration: `cnpj`, `phone`, `address_*` em `organizations` | ❌ Falta |
| `GET /api/user/org-profile` | ❌ Falta |
| `PATCH /api/user/org-profile` (owner/admin) | ❌ Falta |
| `/onboarding/org-profile` — step 2 pós-criação de org | ❌ Falta |
| CEP auto-fill via `viacep.com.br/ws/{cep}/json/` | ❌ Falta |
| `/settings/organization` — edição posterior | ❌ Falta |
| Billing checkout pré-preenchido da org | ❌ Falta |
| Proxy guard: `/onboarding/org-profile` acessível só por usuários autenticados com org | ❌ Falta |

### Campos novos em `organizations`

```sql
cnpj             text            -- CNPJ sem formatação (14 dígitos)
phone            text            -- telefone com DDD
address_street   text
address_number   text
address_complement text
address_zip_code text            -- CEP sem hífen (8 dígitos)
address_city     text
address_state    text            -- UF (2 chars)
```

### Integração ViaCEP
```
GET https://viacep.com.br/ws/{cep}/json/
→ { logradouro, localidade, uf, ... }
Chamada client-side no onBlur do campo CEP.
```

### Billing pré-preenchimento
`/api/billing/checkout` já aceita `holderInfo` opcional. Mudança: se org tiver `cnpj` + `addressZipCode` + `addressNumber` salvos, servidor monta `holderInfo` automaticamente e ignora o body client. Client-side UI lê org profile e pré-preenche campos visuais.

---

## Métricas de sucesso

- Taxa de preenchimento de CNPJ em 7 dias: >70% dos novos cadastros
- Tempo médio até primeira assinatura: redução mensurável (baseline: dados indisponíveis)
- Erros de pagamento Asaas por dados incompletos: zero (baseline: ocorrências manuais)

---

## Riscos

| Risco | Mitigação |
|---|---|
| Owner pular `/onboarding/org-profile` e ir direto ao dashboard | Proxy guard + banner persistente no dashboard até completar |
| ViaCEP fora do ar | Campo endereço editável manualmente; ViaCEP é best-effort |
| CNPJ inválido formato mas salvo | Validação de 14 dígitos numéricos no Zod; validação de dígito verificador no frontend |
| Owner sem permissão para editar (role=member) | `PATCH /api/user/org-profile` verifica role owner/admin |

---

## Dependências

- PRD Integração Asaas (`integracao-asaas.md`) — este PRD alimenta o billing diretamente
- PRD Perfil do Usuário (`perfil-usuario.md`) — campo `phone` em users é do user, não da org; não conflitam
