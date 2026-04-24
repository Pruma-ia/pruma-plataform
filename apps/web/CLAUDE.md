<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

Breaking changes — APIs, conventions, file structure may differ from training data. Read relevant guide in `node_modules/next/dist/docs/` before writing code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# apps/web — Stack e Decisões Arquiteturais

## Next.js 16 — Breaking Changes

### proxy.ts (não middleware.ts)
Route interception uses `src/proxy.ts`. Export as `default` or named `proxy`.
`middleware.ts` not recognized this version.

### Neon DB — placeholder obrigatório no build
`neon()` validates URL on module import. Next.js runs this at build.
Always use: `process.env.DATABASE_URL ?? "postgresql://user:pass@localhost/placeholder"`

### Zod v4
`z.record()` requires two args: `z.record(z.string(), z.unknown())`.
One arg = type error.

---

## Processo de desenvolvimento

### Build antes de commitar (obrigatório)
Run `npm run build` in `apps/web` before any commit.
TypeScript/type errors only surface at build — Vercel fails if not verified locally.

---

## Stack

- Next.js 16.2.4, App Router, TypeScript, Turbopack
- NextAuth v5 — JWT strategy, DrizzleAdapter, Google + Credentials
- Drizzle ORM + PostgreSQL (Neon prod, Docker local `pruma_db`)
- Tailwind CSS v4 with `@theme inline` and oklch, shadcn/ui
- Asaas for BR payments (PIX/boleto)

---

## Autenticação

- JWT carries `organizationId`, `role`, `subscriptionStatus` via join on `organizationMembers`.
- Superadmin (`isSuperAdmin: true`) returns without `organizationId` — accesses orgs by URL.
- `session.user` typed in `src/types/next-auth.d.ts`.

---

## Identidade Visual

Pruma IA colors (use by semantic name, never invent variants):
- Azul Marinho `#0D1B4B` — dark backgrounds, highlight text
- Ciano Elétrico `#00AEEF` — primary actions, positive status
- Ciano Pálido `#E0F6FE` — badge/chip backgrounds
- **Errors always red** — never replace with brand color (semantics)
- Fonts: Barlow (headings) + Inter (body)