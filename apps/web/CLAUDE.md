@AGENTS.md

# apps/web — Stack e Decisões Arquiteturais

## Next.js 16 — Breaking Changes

### proxy.ts (não middleware.ts)
Interceptação de rotas usa `src/proxy.ts`. Exportar como `default` ou named `proxy`.
O nome `middleware.ts` não é reconhecido nesta versão.

### Neon DB — placeholder obrigatório no build
`neon()` valida a URL ao importar o módulo. Next.js executa isso durante o build.
Sempre usar: `process.env.DATABASE_URL ?? "postgresql://user:pass@localhost/placeholder"`

### Zod v4
`z.record()` exige dois argumentos: `z.record(z.string(), z.unknown())`.
Forma de um argumento é erro de tipo.

---

## Processo de desenvolvimento

### Build antes de commitar (obrigatório)
Sempre rodar `npm run build` em `apps/web` antes de qualquer commit.
TypeScript e erros de tipo só aparecem no build — o Vercel falha se isso não for verificado localmente primeiro.

---

## Stack

- Next.js 16.2.4, App Router, TypeScript, Turbopack
- NextAuth v5 — JWT strategy, DrizzleAdapter, Google + Credentials
- Drizzle ORM + PostgreSQL (Neon em produção, Docker local `pruma_db`)
- Tailwind CSS v4 com `@theme inline` e oklch, shadcn/ui
- Asaas para pagamentos BR (PIX/boleto)

---

## Autenticação

- JWT carrega `organizationId`, `role`, `subscriptionStatus` via join em `organizationMembers`.
- Superadmin (`isSuperAdmin: true`) retorna sem `organizationId` — acessa orgs por URL.
- `session.user` tipado em `src/types/next-auth.d.ts`.

---

## Identidade Visual

Cores Pruma IA (usar sempre por nome semântico, não inventar variações):
- Azul Marinho `#0D1B4B` — fundos escuros, textos de destaque
- Ciano Elétrico `#00AEEF` — ações primárias, status positivo
- Ciano Pálido `#E0F6FE` — backgrounds de badges e chips
- **Erros sempre em vermelho** — nunca substituir por brand color (semântica)
- Fontes: Barlow (headings) + Inter (body)
