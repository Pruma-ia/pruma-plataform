/**
 * Seed para UAT da Phase 2 — Gestão e Auditoria.
 *
 * Usa HTTP (POST /api/n8n/approvals) — sem acesso direto ao DB.
 * Funciona com qualquer DATABASE_URL ativa (Neon ou Docker).
 *
 * Cria 10 aprovações pendentes com títulos variados para testar:
 *   #1 Filtros/busca/paginação/export CSV  → /approvals
 *   #3 Timeline (approval_created event)   → /approvals/[id]
 *
 * Para UAT #2 (gate CNPJ): criar conta nova em /register.
 * Para UAT #4 (runs table): npm run test:int:keep (cria flow+runs na org real).
 *
 * Uso:
 *   npm run seed:uat
 *   SEED_ORG_SLUG=<slug> npm run seed:uat  (padrão: lê do painel DEV em /settings/members)
 *
 * Requisito: npm run dev rodando em localhost:3000
 */

import { config } from "dotenv"
import path from "path"

config({ path: path.resolve(process.cwd(), ".env.local") })

const BASE_URL = process.env.SEED_BASE_URL ?? "http://localhost:3000"
const N8N_SECRET = process.env.N8N_WEBHOOK_SECRET ?? "dev-n8n-secret"
const ORG_SLUG = process.env.SEED_ORG_SLUG ?? "teste"

const ts = Date.now()

const APPROVALS = [
  {
    title: "Pagamento Fornecedor ABC Ltda",
    description: "Aprovação de NF #3847 — R$45.000 referente ao contrato de licença de software.",
    n8nExecutionId: `seed-uat-1-${ts}`,
  },
  {
    title: "Contrato de Prestação de Serviços",
    description: "Contrato trimestral com empresa de consultoria. Prazo: 30 dias para revisão jurídica.",
    n8nExecutionId: `seed-uat-2-${ts}`,
  },
  {
    title: "Reembolso Viagem — Diretor Comercial",
    description: "Reembolso de R$3.200 referente a viagem São Paulo–Belo Horizonte.",
    n8nExecutionId: `seed-uat-3-${ts}`,
  },
  {
    title: "Aprovação de Orçamento Q3",
    description: "Orçamento de marketing para Q3/2026 — R$120.000. Requer aprovação da diretoria.",
    n8nExecutionId: `seed-uat-4-${ts}`,
  },
  {
    title: "Contratação Estagiário Dev",
    description: "Aprovação para abertura de vaga de estágio em engenharia. Início previsto: 01/06.",
    n8nExecutionId: `seed-uat-5-${ts}`,
  },
  {
    title: "Compra de Equipamentos TI",
    description: "Aquisição de 5 notebooks Dell para equipe de engenharia — R$32.000.",
    n8nExecutionId: `seed-uat-6-${ts}`,
  },
  {
    title: "Prorrogação de Contrato — Gráfica",
    description: "Prorrogação por 6 meses do contrato de impressão de materiais institucionais.",
    n8nExecutionId: `seed-uat-7-${ts}`,
  },
  {
    title: "Assinatura Ferramenta de Analytics",
    description: "Renovação anual da plataforma de BI — R$18.000. Proposta recebida em 28/04.",
    n8nExecutionId: `seed-uat-8-${ts}`,
  },
  {
    title: "Aquisição de Veículo Corporativo",
    description: "Compra de veículo para equipe de campo — R$85.000. Três cotações anexadas.",
    n8nExecutionId: `seed-uat-9-${ts}`,
  },
  {
    title: "Contrato de Assessoria Jurídica",
    description: "Contratação de escritório externo para suporte em M&A — R$200.000 anuais.",
    n8nExecutionId: `seed-uat-10-${ts}`,
  },
]

async function createApproval(data: (typeof APPROVALS)[number]) {
  const res = await fetch(`${BASE_URL}/api/n8n/approvals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-n8n-secret": N8N_SECRET,
    },
    body: JSON.stringify({
      organizationSlug: ORG_SLUG,
      n8nExecutionId: data.n8nExecutionId,
      callbackUrl: `https://n8n.callback.test/webhook/${data.n8nExecutionId}`,
      title: data.title,
      description: data.description,
    }),
  })

  const body = await res.json().catch(() => ({ error: "não é JSON" }))

  if (!res.ok) {
    throw new Error(`${res.status} ${JSON.stringify(body)}`)
  }

  return body.approvalId as string
}

async function seed() {
  console.log(`\nSeed UAT — ${BASE_URL}`)
  console.log(`Org slug: ${ORG_SLUG}`)
  console.log(`N8N secret: ${N8N_SECRET}\n`)

  const created: Array<{ id: string; title: string }> = []

  for (const a of APPROVALS) {
    process.stdout.write(`  Criando "${a.title}"... `)
    try {
      const id = await createApproval(a)
      created.push({ id, title: a.title })
      console.log(`✓ ${id}`)
    } catch (err) {
      console.log(`✗ ${err instanceof Error ? err.message : err}`)
    }
  }

  console.log(`\n✓ ${created.length}/${APPROVALS.length} aprovações criadas`)
  console.log(`\n  Lista → ${BASE_URL}/approvals`)
  console.log("\n  URLs individuais (UAT #3 — abrir e recarregar para ver timeline):")
  for (const a of created) {
    console.log(`    ${BASE_URL}/approvals/${a.id}`)
    console.log(`    └─ ${a.title}`)
  }

  console.log("\n──────────────────────────────────────────────────────────")
  console.log("Checklist UAT:")
  console.log("  #1 Filtros/busca  → /approvals  (filtrar status, buscar 'Contrato')")
  console.log("  #2 Gate CNPJ      → criar conta nova em /register")
  console.log("  #3 Timeline       → abrir URL acima → recarregar → ver 'Aprovação visualizada'")
  console.log("  #4 Runs table     → npm run test:int:keep  (cria flow+runs na org real)")
  console.log("──────────────────────────────────────────────────────────\n")
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
