# Pruma IA — Monorepo

## O que é este projeto
SaaS multi-tenant conecta fluxos n8n a painel de aprovações humanas. Clientes gerenciam fluxos e aprovam sem acessar n8n.

---

## Como manter esta documentação

### Estrutura em camadas
CLAUDE.md aninhados por contexto — cada um carrega só quando trabalhando naquela área:

```
CLAUDE.md                          ← você está aqui: visão geral + meta-regras
apps/web/CLAUDE.md                 ← stack, Next.js 16, decisões arquiteturais
apps/web/db/CLAUDE.md              ← schema, migrations, convenções de banco
apps/web/src/app/CLAUDE.md         ← regras de negócio, multi-tenant, integrações
```

### Regra de auto-documentação (obrigatória)
Toda decisão de produto, negócio ou arquitetura:
1. Documentar no CLAUDE.md da camada adequada.
2. Incluir **rationale** — *porquê*, não só *o quê*.
3. Não documentar o que código já diz claramente.

### O que NÃO pertence a nenhum CLAUDE.md
- Valores no código (preços, cores, paths, nomes de colunas)
- Estrutura que dev encontra em 2 min de leitura
- Histórico de mudanças (vai no commit)

### Onde cada tipo de contexto deve ficar
| Tipo | Onde |
|---|---|
| Breaking changes de dependências | `apps/web/CLAUDE.md` |
| Regras de isolamento multi-tenant | `apps/web/src/app/CLAUDE.md` |
| Decisões de schema / migration | `apps/web/db/CLAUDE.md` |
| Padrões de integração externa (n8n, Asaas) | `apps/web/src/app/CLAUDE.md` |
| Regra nova de negócio qualquer | camada mais próxima do código afetado |

---

## Fluxo de desenvolvimento (obrigatório)

### Modelo de branches

```
feat/<nome> → master (staging) → production (prod)
```

| Branch | Ambiente | Banco | Deploy |
|---|---|---|---|
| `feat/*` | local | Docker local | — |
| `master` | staging | Neon branch `staging` | Vercel preview |
| `production` | produção | Neon branch `main` | Vercel production |

**Regra para o Claude:** ao iniciar qualquer feature, checar `git branch --show-current`. Se estiver em `master` ou `production`, criar branch `feat/<nome>` imediatamente antes de tocar qualquer arquivo.

**Regra absoluta:** nunca mergar `feat/*` direto em `production`. Sempre passar por `master` primeiro.

### Sequência de desenvolvimento

1. Criar `feat/<nome>` a partir de `master`
2. Implementar + testes + Playwright (se UI)
3. PR `feat/<nome>` → `master` (staging)
4. CI valida migrations, deploya em staging, aplica `db:migrate` no Neon staging
5. Validar manualmente no staging URL gerado pelo Vercel
6. PR `master` → `production` (promoção de release)
7. CI testa migrations em Neon preview do main, aplica em prod, deploya

**Rationale:** migrations sem staging causavam erros silenciosos em prod (journal desync, `when` errado). Toda migration agora é testada contra dados reais de staging antes de tocar prod.

### Setup inicial obrigatório (one-time, manual)

Antes do pipeline funcionar completamente:

1. **Neon console:** criar branch `staging` a partir de `main` → copiar branch ID
2. **Neon console:** rodar baseline no staging (banco criado sem `__drizzle_migrations`):
   ```bash
   DATABASE_URL=<neon-staging-url> npm run db:baseline
   ```
3. **GitHub → Settings → Environments:** criar environment `staging` com secrets:
   - `NEON_API_KEY` (mesmo do prod)
   - `NEON_STAGING_BRANCH_ID` (branch ID do passo 1)
   - `DATABASE_URL_STAGING` (connection string do passo 1)
   - `VERCEL_TOKEN` (mesmo do prod)
4. **GitHub → Settings → Branches:** proteger `production` — require PR, no direct push, require status checks (`Validate Migrations`)
5. **Vercel dashboard:** desabilitar auto-deploy da integração GitHub (CI faz deploy via CLI)

### Validação visual com Playwright (obrigatória para features de UI)

Ao finalizar qualquer feature com componentes visuais, rodar Playwright antes de abrir PR:

```bash
cd apps/web && npx playwright test
```

Ciclo obrigatório:
1. Implementar feature
2. Rodar Playwright → inspecionar screenshots em `tests/e2e/screenshots/`
3. Corrigir bugs visuais, UX e acessibilidade encontrados
4. Rodar novamente até todos os testes passarem
5. Só então abrir PR

**Regra para o Claude:** ao concluir implementação de UI, propor rodar Playwright sem esperar o usuário pedir. Se não existir spec para a feature, criar junto com a implementação.

**Rationale:** componentes são avaliados visualmente — type check e unit tests não detectam regressões de layout, contraste, foco ou estados de loading. Playwright com screenshots fecha esse gap antes do code review.

---

## Estrutura do monorepo
- `apps/web/` — aplicação Next.js (produto principal)
- `claude-skills/` — skills e agentes Claude (tooling interno)

---

## Diagrama de arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                     Vercel (Next.js 16)                     │
│                                                             │
│  proxy.ts (middleware)                                      │
│  ├── rate limiting em /api/auth e /api/n8n                  │
│  ├── subscription guard → redireciona canceled/inactive     │
│  └── proteção do /admin (superadmin only)                   │
│                                                             │
│  ┌─────────────────┐  ┌─────────────┐  ┌────────────────┐  │
│  │  (dashboard)    │  │   (admin)   │  │  (auth)        │  │
│  │  /dashboard     │  │  /admin     │  │  /login        │  │
│  │  /flows         │  │  /orgs/[id] │  │  /register     │  │
│  │  /approvals     │  │             │  │                │  │
│  │  /billing       │  │             │  │                │  │
│  │  /settings      │  │             │  │                │  │
│  └─────────────────┘  └─────────────┘  └────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  /api                                                │   │
│  │  ├─ auth/[...nextauth]   NextAuth v5                 │   │
│  │  ├─ auth/register        cadastro credentials        │   │
│  │  ├─ n8n/flows            webhook → upsert flow       │   │
│  │  ├─ n8n/approvals        webhook → cria approval     │   │
│  │  ├─ approvals/[id]/approve|reject                    │   │
│  │  ├─ billing/checkout|portal  Asaas                   │   │
│  │  ├─ webhooks/asaas        atualiza subscriptionStatus │   │
│  │  ├─ organizations/*       convites e membros         │   │
│  │  ├─ admin/*               leitura superadmin         │   │
│  │  └─ maintenance/cleanup-flow-runs  cron diário       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  lib: auth.ts │ db.ts │ n8n.ts │ asaas.ts                   │
└────────────────────────┬────────────────────────────────────┘
                         │
           ┌─────────────┼──────────────┐
           ▼             ▼              ▼
     PostgreSQL         n8n           Asaas
     (Neon prod /    (webhooks,     (PIX/boleto,
      Docker local)   callbacks)     assinaturas BR)
           │
   pruma-deploy-kit
   (git submodule nos
    repos dos clientes)
```

### Regra de atualização do diagrama

Atualizar **sempre que**:
- Nova rota `/api/*` adicionada
- Nova integração externa introduzida
- `proxy.ts` alterado (novos guards ou rate limits)
- Nova seção do painel criada

**Não** atualizar: mudanças internas de implementação, novos componentes UI, ajustes de schema sem impacto no fluxo entre serviços.

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
