# Pruma IA — Monorepo

## O que é este projeto
SaaS multi-tenant que conecta fluxos de automação do n8n a um painel de aprovações humanas. Clientes gerenciam seus fluxos e tomam decisões de aprovação sem acessar o n8n diretamente.

---

## Como manter esta documentação

### Estrutura em camadas
Os arquivos CLAUDE.md são aninhados por contexto — cada um só é carregado quando você está trabalhando naquela área:

```
CLAUDE.md                          ← você está aqui: visão geral + meta-regras
apps/web/CLAUDE.md                 ← stack, Next.js 16, decisões arquiteturais
apps/web/db/CLAUDE.md              ← schema, migrations, convenções de banco
apps/web/src/app/CLAUDE.md         ← regras de negócio, multi-tenant, integrações
```

### Regra de auto-documentação (obrigatória)
Sempre que uma decisão de produto, negócio ou arquitetura for tomada:
1. Documentar no CLAUDE.md da camada adequada (ver estrutura acima).
2. Incluir o **rationale** — o *porquê*, não só o *o quê*.
3. Não documentar o que o código já diz claramente.

### O que NÃO pertence a nenhum CLAUDE.md
- Valores que estão no código (preços, cores, paths de arquivo, nomes de colunas)
- Estrutura que qualquer dev encontra em 2 min de leitura
- Histórico de mudanças (isso vai no commit)

### Onde cada tipo de contexto deve ficar
| Tipo | Onde |
|---|---|
| Breaking changes de dependências | `apps/web/CLAUDE.md` |
| Regras de isolamento multi-tenant | `apps/web/src/app/CLAUDE.md` |
| Decisões de schema / migration | `apps/web/db/CLAUDE.md` |
| Padrões de integração externa (n8n, Asaas) | `apps/web/src/app/CLAUDE.md` |
| Regra nova de negócio qualquer | camada mais próxima do código afetado |

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

Atualizar este diagrama **sempre que**:
- Uma nova rota de API for adicionada (`/api/*`)
- Uma nova integração externa for introduzida (novo serviço externo)
- O comportamento do `proxy.ts` for alterado (novos guards ou rate limits)
- Uma nova seção do painel (`(dashboard)`, `(admin)`) for criada

**Não** atualizar para: mudanças internas de implementação, novos componentes UI, ou ajustes de schema que não alteram o fluxo de dados entre serviços.
