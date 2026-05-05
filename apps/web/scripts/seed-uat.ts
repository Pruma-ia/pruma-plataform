/**
 * Seed para UAT da Phase 2 — Gestão e Auditoria.
 *
 * Usa HTTP (POST /api/n8n/flows + /api/n8n/approvals) — sem acesso direto ao DB.
 * Funciona com qualquer DATABASE_URL ativa (Neon ou Docker).
 *
 * Cria:
 *   - 3 flows com múltiplas execuções (status variados) → /flows
 *   - 10 aprovações distribuídas entre os flows → /approvals
 *
 * Cobre todos os 4 UAT items da Phase 2:
 *   #1 Filtros/busca/paginação/export CSV  → /approvals
 *   #2 Gate CNPJ                           → criar conta nova em /register
 *   #3 Timeline (approval_created event)   → /approvals/[id]
 *   #4 Runs table com etapas/duração       → /flows/[id]
 *
 * Uso:
 *   npm run seed:uat
 *   SEED_ORG_SLUG=<slug> npm run seed:uat
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
const ago = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000).toISOString()

// ── Flows ─────────────────────────────────────────────────────────────────────

const FLOWS: Array<{
  prumaFlowId: string
  name: string
  description: string
  runs: Array<{
    n8nExecutionId: string
    status: "running" | "success" | "error" | "waiting"
    startedAt: string
    finishedAt?: string
    metadata?: Record<string, unknown>
  }>
}> = [
  {
    prumaFlowId: "seed-despesas",
    name: "Aprovação de Despesas",
    description: "Fluxo de aprovação para pagamentos, reembolsos e aquisições.",
    runs: [
      {
        n8nExecutionId: `seed-flow-despesas-1-${ts}`,
        status: "success",
        startedAt: ago(120),
        finishedAt: ago(118),
        metadata: { etapas: ["Triagem", "Validação Financeira", "Aprovação Diretoria"] },
      },
      {
        n8nExecutionId: `seed-flow-despesas-2-${ts}`,
        status: "success",
        startedAt: ago(60),
        finishedAt: ago(58),
        metadata: { etapas: ["Triagem", "Aprovação Gerência"] },
      },
      {
        n8nExecutionId: `seed-flow-despesas-3-${ts}`,
        status: "waiting",
        startedAt: ago(5),
        metadata: { etapas: ["Triagem", "Validação Financeira", "Aprovação Diretoria"] },
      },
    ],
  },
  {
    prumaFlowId: "seed-contratacao",
    name: "Contratação e RH",
    description: "Fluxo para aprovação de vagas, contratos de trabalho e prestadores.",
    runs: [
      {
        n8nExecutionId: `seed-flow-rh-1-${ts}`,
        status: "success",
        startedAt: ago(200),
        finishedAt: ago(195),
        metadata: { etapas: ["Abertura de Vaga", "Aprovação RH", "Aprovação Financeira"] },
      },
      {
        n8nExecutionId: `seed-flow-rh-2-${ts}`,
        status: "error",
        startedAt: ago(90),
        finishedAt: ago(89),
        metadata: { etapas: ["Abertura de Vaga"] },
      },
      {
        n8nExecutionId: `seed-flow-rh-3-${ts}`,
        status: "waiting",
        startedAt: ago(10),
        metadata: { etapas: ["Abertura de Vaga", "Aprovação RH"] },
      },
    ],
  },
  {
    prumaFlowId: "seed-contratos",
    name: "Contratos e Jurídico",
    description: "Fluxo de revisão e aprovação de contratos com terceiros.",
    runs: [
      {
        n8nExecutionId: `seed-flow-contratos-1-${ts}`,
        status: "success",
        startedAt: ago(300),
        finishedAt: ago(290),
        metadata: { etapas: ["Revisão Jurídica", "Aprovação Diretoria", "Assinatura"] },
      },
      {
        n8nExecutionId: `seed-flow-contratos-2-${ts}`,
        status: "success",
        startedAt: ago(150),
        finishedAt: ago(145),
        metadata: { etapas: ["Revisão Jurídica", "Aprovação Diretoria"] },
      },
      {
        n8nExecutionId: `seed-flow-contratos-3-${ts}`,
        status: "waiting",
        startedAt: ago(15),
        metadata: { etapas: ["Revisão Jurídica", "Aprovação Diretoria", "Assinatura"] },
      },
    ],
  },
]

// ── Approvals ─────────────────────────────────────────────────────────────────

const APPROVALS = [
  {
    title: "Pagamento Fornecedor ABC Ltda",
    description: "Aprovação de NF #3847 — R$45.000 referente ao contrato de licença de software.",
    n8nExecutionId: `seed-uat-1-${ts}`,
    prumaFlowId: "seed-despesas",
  },
  {
    title: "Contrato de Prestação de Serviços",
    description: "Contrato trimestral com empresa de consultoria. Prazo: 30 dias para revisão jurídica.",
    n8nExecutionId: `seed-uat-2-${ts}`,
    prumaFlowId: "seed-contratos",
  },
  {
    title: "Reembolso Viagem — Diretor Comercial",
    description: "Reembolso de R$3.200 referente a viagem São Paulo–Belo Horizonte.",
    n8nExecutionId: `seed-uat-3-${ts}`,
    prumaFlowId: "seed-despesas",
  },
  {
    title: "Aprovação de Orçamento Q3",
    description: "Orçamento de marketing para Q3/2026 — R$120.000. Requer aprovação da diretoria.",
    n8nExecutionId: `seed-uat-4-${ts}`,
    prumaFlowId: "seed-despesas",
  },
  {
    title: "Contratação Estagiário Dev",
    description: "Aprovação para abertura de vaga de estágio em engenharia. Início previsto: 01/06.",
    n8nExecutionId: `seed-uat-5-${ts}`,
    prumaFlowId: "seed-contratacao",
  },
  {
    title: "Compra de Equipamentos TI",
    description: "Aquisição de 5 notebooks Dell para equipe de engenharia — R$32.000.",
    n8nExecutionId: `seed-uat-6-${ts}`,
    prumaFlowId: "seed-despesas",
  },
  {
    title: "Prorrogação de Contrato — Gráfica",
    description: "Prorrogação por 6 meses do contrato de impressão de materiais institucionais.",
    n8nExecutionId: `seed-uat-7-${ts}`,
    prumaFlowId: "seed-contratos",
  },
  {
    title: "Assinatura Ferramenta de Analytics",
    description: "Renovação anual da plataforma de BI — R$18.000. Proposta recebida em 28/04.",
    n8nExecutionId: `seed-uat-8-${ts}`,
    prumaFlowId: "seed-despesas",
  },
  {
    title: "Aquisição de Veículo Corporativo",
    description: "Compra de veículo para equipe de campo — R$85.000. Três cotações anexadas.",
    n8nExecutionId: `seed-uat-9-${ts}`,
    prumaFlowId: "seed-despesas",
  },
  {
    title: "Contrato de Assessoria Jurídica",
    description: "Contratação de escritório externo para suporte em M&A — R$200.000 anuais.",
    n8nExecutionId: `seed-uat-10-${ts}`,
    prumaFlowId: "seed-contratos",
  },
]

// ── HTTP helpers ──────────────────────────────────────────────────────────────

async function post(path: string, body: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-n8n-secret": N8N_SECRET },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({ error: "não é JSON" }))
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(json)}`)
  return json
}

// ── Seed ──────────────────────────────────────────────────────────────────────

async function seed() {
  console.log(`\nSeed UAT — ${BASE_URL}`)
  console.log(`Org slug: ${ORG_SLUG}`)
  console.log(`N8N secret: ${N8N_SECRET}\n`)

  // 1. Flows + runs
  console.log("── Flows ─────────────────────────────────────────────────")
  const flowIds: Record<string, string> = {}

  for (const flow of FLOWS) {
    console.log(`  Flow "${flow.name}"`)
    for (const run of flow.runs) {
      process.stdout.write(`    run ${run.status}... `)
      try {
        const json = await post("/api/n8n/flows", {
          organizationSlug: ORG_SLUG,
          prumaFlowId: flow.prumaFlowId,
          name: flow.name,
          description: flow.description,
          status: run.status,
          n8nExecutionId: run.n8nExecutionId,
          metadata: run.metadata,
          startedAt: run.startedAt,
          finishedAt: run.finishedAt,
        })
        flowIds[flow.prumaFlowId] = json.flowId
        console.log(`✓`)
      } catch (err) {
        console.log(`✗ ${err instanceof Error ? err.message : err}`)
      }
    }
  }

  // 2. Aprovações
  console.log("\n── Aprovações ────────────────────────────────────────────")
  const created: Array<{ id: string; title: string }> = []

  for (const a of APPROVALS) {
    process.stdout.write(`  "${a.title}"... `)
    try {
      const json = await post("/api/n8n/approvals", {
        organizationSlug: ORG_SLUG,
        n8nExecutionId: a.n8nExecutionId,
        callbackUrl: `https://n8n.callback.test/webhook/${a.n8nExecutionId}`,
        title: a.title,
        description: a.description,
        prumaFlowId: a.prumaFlowId,
      })
      created.push({ id: json.approvalId, title: a.title })
      console.log(`✓ ${json.approvalId}`)
    } catch (err) {
      console.log(`✗ ${err instanceof Error ? err.message : err}`)
    }
  }

  // 3. Resumo
  console.log(`\n✓ ${created.length}/${APPROVALS.length} aprovações criadas`)

  console.log("\n  Flows (UAT #4 — runs table):")
  for (const [prumaId, flowId] of Object.entries(flowIds)) {
    const name = FLOWS.find((f) => f.prumaFlowId === prumaId)?.name ?? prumaId
    console.log(`    ${BASE_URL}/flows/${flowId}  →  ${name}`)
  }

  console.log("\n  Aprovações (UAT #3 — timeline):")
  for (const a of created.slice(0, 3)) {
    console.log(`    ${BASE_URL}/approvals/${a.id}  →  ${a.title}`)
  }

  console.log("\n──────────────────────────────────────────────────────────")
  console.log("Checklist UAT:")
  console.log("  #1 Filtros/busca  → /approvals  (filtrar por fluxo, buscar 'Contrato')")
  console.log("  #2 Gate CNPJ      → criar conta nova em /register")
  console.log("  #3 Timeline       → abrir URL de aprovação acima → recarregar → ver 'Aprovação visualizada'")
  console.log("  #4 Runs table     → abrir URL de flow acima → ver tabela com etapas, status e duração")
  console.log("──────────────────────────────────────────────────────────\n")
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
