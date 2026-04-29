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

Nunca implementar features direto na `master`. Sequência:

1. Commitar trabalho aberto na branch atual
2. Criar branch `feat/<nome-da-feature>` **antes de escrever qualquer código** — sem exceção
3. Mergar apenas via Pull Request

**Regra para o Claude:** ao iniciar qualquer feature, a primeira ação obrigatória é criar a branch. Antes de editar qualquer arquivo, checar `git branch --show-current`. Se estiver em `master`, criar branch imediatamente.

**Rationale:** master deve refletir só código revisado. Feature branches isolam dev e permitem PR review antes de integrar. Mudança feita em master antes da branch = retrabalho de cherry-pick ou reset.

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
