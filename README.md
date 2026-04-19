# Pruma Platform

Plataforma SaaS multi-tenant para orquestração e supervisão de fluxos de automação com IA, integrada ao **n8n** para execução de workflows e ao **Asaas** para gestão de assinaturas e cobrança.

## Propósito

A Pruma Platform centraliza o controle de automações inteligentes para organizações, oferecendo:

- **Visibilidade de fluxos** — acompanhe em tempo real o status de cada workflow rodando no n8n (sucesso, erro, aguardando, em execução)
- **Aprovações humanas** — fluxos que exigem decisão humana criam tarefas de aprovação diretamente na plataforma, com callback automático ao n8n após aprovação ou rejeição
- **Multi-tenancy** — cada organização tem seu espaço isolado com membros, papéis (owner, admin, member, viewer) e convites por e-mail
- **Billing integrado** — assinaturas gerenciadas via Asaas com suporte a trial, ativo, inadimplente e cancelado

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 16 + React 19 + Tailwind CSS v4 |
| Auth | NextAuth v5 (Auth.js) |
| ORM | Drizzle ORM |
| Banco | PostgreSQL (Neon serverless) |
| UI | shadcn/ui + Lucide |
| Billing | Asaas (webhooks) |
| Automação | n8n (webhooks de entrada e callbacks) |

## Estrutura do Monorepo

```
pruma-plataform/
└── apps/
    └── web/          # Aplicação Next.js principal
        ├── src/app/  # App Router — páginas, layouts e API routes
        └── db/       # Schema Drizzle (organizations, flows, approvals)
```

## Começando

```bash
cd apps/web
cp .env.example .env.local
npm install
npm run dev
```

Consulte [apps/web/.env.example](apps/web/.env.example) para as variáveis necessárias (banco, auth, Asaas, n8n).
