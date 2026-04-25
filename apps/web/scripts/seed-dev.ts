/**
 * Seed script para debug visual do fluxo de aprovações ricas.
 *
 * Cria 3 aprovações com diferentes tipos de arquivo:
 *   1. "Aprovação de Contrato"    → [PDF, DOCX]
 *   2. "Aprovação de NF / Recibo" → [XML, JPEG]
 *   3. "Aprovação de Relatório"   → [XLSX, CSV]
 *
 * Faz o que o n8n faria:
 *   1. Presign → obtém uploadUrl + r2Key do servidor local
 *   2. PUT real no MinIO com arquivo de exemplo
 *   3. Cria aprovação com arquivo e decisionFields
 *   4. Imprime URLs para abrir no browser
 *
 * Requer: npm run dev rodando + MinIO rodando (docker compose up -d minio minio-init)
 *
 * Uso:
 *   INT_TEST_ORG_ID=<uuid> npm run seed:dev
 *   SEED_N8N_SLUG=<slug>   npm run seed:dev
 */
import { config } from "dotenv"
import path from "path"

config({ path: path.resolve(process.cwd(), ".env.local") })

const BASE_URL = process.env.SEED_BASE_URL ?? "http://localhost:3000"
const N8N_SECRET = process.env.N8N_WEBHOOK_SECRET ?? ""
const ORG_ID = process.env.INT_TEST_ORG_ID

// ── File buffers ──────────────────────────────────────────────────────────────

// Minimal valid PDF — offsets computed to match xref table exactly
// obj1@9, obj2@56, obj3@111, xref@180
const PDF_CONTENT = Buffer.from(
  "%PDF-1.4\n" +
  "1 0 obj\n" +
  "<</Type /Catalog /Pages 2 0 R>>\n" +
  "endobj\n" +
  "2 0 obj\n" +
  "<</Type /Pages /Kids [3 0 R] /Count 1>>\n" +
  "endobj\n" +
  "3 0 obj\n" +
  "<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]>>\n" +
  "endobj\n" +
  "xref\n" +
  "0 4\n" +
  "0000000000 65535 f \n" +
  "0000000009 00000 n \n" +
  "0000000056 00000 n \n" +
  "0000000111 00000 n \n" +
  "trailer\n" +
  "<</Size 4 /Root 1 0 R>>\n" +
  "startxref\n" +
  "180\n" +
  "%%EOF\n"
)

// 1×1 pixel PNG — valid image, renders in preview
const PNG_CONTENT = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
)

// 1×1 pixel white JPEG — valid and renderable in browser image preview
const JPEG_CONTENT = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkS" +
  "Ew8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARC" +
  "AABAAEDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAABAMC/8QAFhABAQEA" +
  "AAAAAAAAAAAAAAAAAREh/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMR" +
  "AD8Az1gQEBMB/9k=",
  "base64"
)

// NF-e XML stub — realistic structure, valid XML
const XML_CONTENT = Buffer.from(
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">\n` +
  `  <NFe>\n` +
  `    <infNFe Id="NFe35260400000000000155550010000000011000000011" versao="4.00">\n` +
  `      <ide>\n` +
  `        <cUF>35</cUF>\n` +
  `        <natOp>VENDA DE PRODUTO</natOp>\n` +
  `        <mod>55</mod>\n` +
  `        <serie>1</serie>\n` +
  `        <nNF>1</nNF>\n` +
  `        <dhEmi>2026-04-25T10:00:00-03:00</dhEmi>\n` +
  `      </ide>\n` +
  `      <emit>\n` +
  `        <CNPJ>00000000000155</CNPJ>\n` +
  `        <xNome>EMPRESA SEED LTDA</xNome>\n` +
  `        <xFant>SEED CO</xFant>\n` +
  `      </emit>\n` +
  `      <det nItem="1">\n` +
  `        <prod>\n` +
  `          <cProd>001</cProd>\n` +
  `          <xProd>PRODUTO EXEMPLO</xProd>\n` +
  `          <NCM>84713012</NCM>\n` +
  `          <CFOP>5102</CFOP>\n` +
  `          <uCom>UN</uCom>\n` +
  `          <qCom>2.0000</qCom>\n` +
  `          <vUnCom>750.00</vUnCom>\n` +
  `          <vProd>1500.00</vProd>\n` +
  `        </prod>\n` +
  `      </det>\n` +
  `      <total>\n` +
  `        <ICMSTot><vNF>1500.00</vNF></ICMSTot>\n` +
  `      </total>\n` +
  `    </infNFe>\n` +
  `  </NFe>\n` +
  `</nfeProc>\n`
)

const CSV_CONTENT = Buffer.from(
  "ID,Descricao,Quantidade,Valor Unitario,Total\n" +
  "1,Consultoria Tecnica,10,500.00,5000.00\n" +
  "2,Licenca de Software,1,1200.00,1200.00\n" +
  "3,Suporte Mensal,5,300.00,1500.00\n" +
  "4,Treinamento,2,800.00,1600.00\n" +
  ",,,Total,9300.00\n"
)

function buildXlsx(): Buffer {
  const { utils, write } = require("xlsx") as typeof import("xlsx")
  const rows = [
    ["ID", "Descrição", "Quantidade", "Valor Unitário", "Total"],
    [1, "Consultoria Técnica", 10, 500.0, 5000.0],
    [2, "Licença de Software", 1, 1200.0, 1200.0],
    [3, "Suporte Mensal", 5, 300.0, 1500.0],
    [4, "Treinamento", 2, 800.0, 1600.0],
    ["", "", "", "Total", 9300.0],
  ]
  const ws = utils.aoa_to_sheet(rows)
  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, "Relatório Q1")
  return Buffer.from(write(wb, { type: "buffer", bookType: "xlsx" }))
}

function buildDocx(): Promise<Buffer> {
  const {
    Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
    WidthType,
  } = require("docx") as typeof import("docx")

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: "Proposta Comercial — SEED CO",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({ text: "Cliente: ", bold: true }),
              new TextRun("Empresa Exemplo Ltda"),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Data: ", bold: true }),
              new TextRun("25/04/2026"),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "Escopo dos serviços", heading: HeadingLevel.HEADING_2 }),
          new Paragraph("Este documento descreve a proposta de prestação de serviços entre SEED CO e Empresa Exemplo Ltda."),
          new Paragraph({ text: "" }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Serviço", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Valor", bold: true })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Consultoria Técnica")] }),
                  new TableCell({ children: [new Paragraph("R$ 5.000,00")] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Licença de Software")] }),
                  new TableCell({ children: [new Paragraph("R$ 1.200,00")] }),
                ],
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({ text: "Total: ", bold: true }),
              new TextRun("R$ 6.200,00"),
            ],
          }),
        ],
      },
    ],
  })

  return Packer.toBuffer(doc)
}

const XLSX_CONTENT = buildXlsx()

// ── Types ─────────────────────────────────────────────────────────────────────

type FileSpec = {
  filename: string
  mimeType: string
  content: Buffer
}

type DecisionField = {
  id: string
  type: "select"
  label: string
  options: { id: string; label: string }[]
  required?: boolean
}

type ApprovalSpec = {
  title: string
  description: string
  files: FileSpec[]
  decisionFields: DecisionField[]
  resolveAs?: {
    status: "approved" | "rejected"
    comment: string
    decisionValues?: Record<string, string>
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function cleanup(orgId: string) {
  const { db } = await import("../src/lib/db")
  const { approvals, approvalFiles, approvalFileUploads } = await import("../db/schema")
  const { deleteObject } = await import("../src/lib/r2")
  const { eq, and, like, inArray } = await import("drizzle-orm")

  const seedApprovals = await db
    .select({ id: approvals.id })
    .from(approvals)
    .where(and(eq(approvals.organizationId, orgId), like(approvals.n8nExecutionId, "seed-%")))

  if (seedApprovals.length === 0) {
    console.log("[cleanup] Nenhuma aprovação seed anterior encontrada\n")
    return
  }

  const approvalIds = seedApprovals.map((a) => a.id)
  const files = await db
    .select({ r2Key: approvalFiles.r2Key })
    .from(approvalFiles)
    .where(inArray(approvalFiles.approvalId, approvalIds))

  for (const file of files) {
    await deleteObject(file.r2Key).catch(() => {})
  }

  await db
    .delete(approvals)
    .where(and(eq(approvals.organizationId, orgId), like(approvals.n8nExecutionId, "seed-%")))

  // Limpa uploads pendentes de runs anteriores abortados
  await db.delete(approvalFileUploads).where(eq(approvalFileUploads.organizationId, orgId))

  console.log(`[cleanup] ${seedApprovals.length} aprovação(ões), ${files.length} arquivo(s) R2 removidos\n`)
}

async function uploadFile(
  n8nSlug: string,
  file: FileSpec
): Promise<{ r2Key: string; filename: string; mimeType: string; sizeBytes: number }> {
  const presignRes = await fetch(`${BASE_URL}/api/n8n/approvals/files/presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-n8n-secret": N8N_SECRET },
    body: JSON.stringify({
      organizationSlug: n8nSlug,
      filename: file.filename,
      mimeType: file.mimeType,
      sizeBytes: file.content.byteLength,
    }),
  })
  if (!presignRes.ok) {
    throw new Error(`Presign ${file.filename} falhou (${presignRes.status}): ${await presignRes.text()}`)
  }
  const { uploadUrl, r2Key } = await presignRes.json()

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.mimeType, "Content-Length": String(file.content.byteLength) },
    body: new Uint8Array(file.content),
  })
  if (!putRes.ok) {
    throw new Error(`PUT MinIO ${file.filename} falhou (${putRes.status}): ${await putRes.text()}`)
  }

  return { r2Key, filename: file.filename, mimeType: file.mimeType, sizeBytes: file.content.byteLength }
}

async function createApproval(n8nSlug: string, spec: ApprovalSpec): Promise<string> {
  const uploadedFiles = []
  for (const file of spec.files) {
    const result = await uploadFile(n8nSlug, file)
    uploadedFiles.push(result)
    console.log(`    ↑ ${file.filename} (${file.mimeType}) — ${result.r2Key}`)
  }

  const approvalRes = await fetch(`${BASE_URL}/api/n8n/approvals`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-n8n-secret": N8N_SECRET },
    body: JSON.stringify({
      organizationSlug: n8nSlug,
      n8nExecutionId: `seed-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      callbackUrl: "https://n8n.callback.test/webhook/seed",
      title: spec.title,
      description: spec.description,
      decisionFields: spec.decisionFields,
      files: uploadedFiles,
    }),
  })
  if (!approvalRes.ok) {
    throw new Error(`Criar aprovação "${spec.title}" falhou (${approvalRes.status}): ${await approvalRes.text()}`)
  }
  const { approvalId } = await approvalRes.json()
  return approvalId
}

// ── Aprovações ────────────────────────────────────────────────────────────────

function buildApprovals(docxContent: Buffer): ApprovalSpec[] {
  return [
  {
    title: "Aprovação de Contrato (seed)",
    description: "Contrato de prestação de serviços — validação visual PDF + DOCX",
    files: [
      { filename: "contrato-servicos.pdf", mimeType: "application/pdf", content: PDF_CONTENT },
      {
        filename: "proposta-comercial.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        content: docxContent,
      },
    ],
    decisionFields: [
      {
        id: "advogado",
        type: "select",
        label: "Advogado responsável",
        required: true,
        options: [
          { id: "adv-1", label: "João Silva" },
          { id: "adv-2", label: "Maria Santos" },
        ],
      },
      {
        id: "tipo_contrato",
        type: "select",
        label: "Tipo de contrato",
        options: [
          { id: "prestacao", label: "Prestação de serviço" },
          { id: "compra", label: "Compra e venda" },
          { id: "parceria", label: "Parceria comercial" },
        ],
      },
    ],
  },
  {
    title: "Aprovação de NF / Recibo (seed)",
    description: "Nota fiscal eletrônica + foto do recibo — validação visual XML + JPEG",
    files: [
      { filename: "nfe-001.xml", mimeType: "application/xml", content: XML_CONTENT },
      { filename: "foto-recibo.jpg", mimeType: "image/jpeg", content: JPEG_CONTENT },
      { filename: "screenshot-sistema.png", mimeType: "image/png", content: PNG_CONTENT },
    ],
    decisionFields: [
      {
        id: "centro_custo",
        type: "select",
        label: "Centro de custo",
        required: true,
        options: [
          { id: "cc-ti", label: "TI" },
          { id: "cc-rh", label: "RH" },
          { id: "cc-mkt", label: "Marketing" },
        ],
      },
      {
        id: "categoria",
        type: "select",
        label: "Categoria",
        required: true,
        options: [
          { id: "fornecedor", label: "Fornecedor" },
          { id: "despesa", label: "Despesa operacional" },
          { id: "investimento", label: "Investimento" },
        ],
      },
    ],
  },
  {
    title: "Aprovação de Relatório Financeiro (seed)",
    description: "Relatório trimestral + dados brutos — validação visual XLSX + CSV",
    files: [
      {
        filename: "relatorio-q1-2026.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        content: XLSX_CONTENT,
      },
      { filename: "dados-exportados.csv", mimeType: "text/csv", content: CSV_CONTENT },
    ],
    decisionFields: [
      {
        id: "departamento",
        type: "select",
        label: "Departamento",
        required: true,
        options: [
          { id: "financeiro", label: "Financeiro" },
          { id: "operacoes", label: "Operações" },
          { id: "diretoria", label: "Diretoria" },
        ],
      },
      {
        id: "periodo",
        type: "select",
        label: "Período de referência",
        required: true,
        options: [
          { id: "q1", label: "Q1 2026" },
          { id: "q2", label: "Q2 2026" },
          { id: "q3", label: "Q3 2026" },
          { id: "q4", label: "Q4 2026" },
        ],
      },
    ],
  },

  // ── Sem arquivos — pending ──────────────────────────────────────────────────
  {
    title: "Solicitação de Viagem Corporativa (seed)",
    description:
      "João Silva solicita viagem a São Paulo nos dias 12–14/05/2026 para reunião com cliente estratégico. " +
      "Estimativa de despesas: passagem R$ 650, hospedagem R$ 420, alimentação R$ 150.",
    files: [],
    decisionFields: [
      {
        id: "categoria",
        type: "select",
        label: "Categoria da viagem",
        required: true,
        options: [
          { id: "cliente", label: "Visita a cliente" },
          { id: "evento", label: "Evento / Conferência" },
          { id: "treinamento", label: "Treinamento" },
        ],
      },
      {
        id: "urgencia",
        type: "select",
        label: "Urgência",
        options: [
          { id: "normal", label: "Normal" },
          { id: "urgente", label: "Urgente" },
        ],
      },
    ],
  },

  // ── Sem arquivos — aprovada ─────────────────────────────────────────────────
  {
    title: "Compra de Equipamento TI (seed)",
    description:
      "Requisição de 2 notebooks Dell Latitude 5540 para novos colaboradores do time de engenharia. " +
      "Fornecedor: InfoTech Distribuidora. Valor total: R$ 11.400,00.",
    files: [],
    decisionFields: [
      {
        id: "fornecedor",
        type: "select",
        label: "Fornecedor preferencial",
        options: [
          { id: "infotech", label: "InfoTech Distribuidora" },
          { id: "tekmais", label: "TekMais" },
          { id: "outra", label: "Outra cotação" },
        ],
      },
      {
        id: "centro_custo",
        type: "select",
        label: "Centro de custo",
        required: true,
        options: [
          { id: "eng", label: "Engenharia" },
          { id: "produto", label: "Produto" },
          { id: "ops", label: "Operações" },
        ],
      },
    ],
    resolveAs: {
      status: "approved",
      comment: "Orçamento aprovado. Dentro do limite anual de TI.",
      decisionValues: { fornecedor: "infotech", centro_custo: "eng" },
    },
  },

  // ── Sem arquivos — rejeitada ────────────────────────────────────────────────
  {
    title: "Contratação de Freelancer (seed)",
    description:
      "Solicitação de contratação de designer freelancer para redesign da landing page. " +
      "Proposta: 3 semanas, R$ 8.500,00. Portfólio enviado por e-mail.",
    files: [],
    decisionFields: [
      {
        id: "modalidade",
        type: "select",
        label: "Modalidade de contratação",
        required: true,
        options: [
          { id: "freelancer", label: "Freelancer (PJ)" },
          { id: "clt", label: "CLT" },
          { id: "estagio", label: "Estágio" },
        ],
      },
    ],
    resolveAs: {
      status: "rejected",
      comment:
        "Budget de marketing já comprometido para Q2. Rever na próxima janela orçamentária (Q3/2026).",
      decisionValues: { modalidade: "freelancer" },
    },
  },

  // ── Com arquivo — aprovada ──────────────────────────────────────────────────
  {
    title: "Autorização de Despesa — Fornecedor (seed)",
    description:
      "NF-e referente à prestação de serviços de limpeza industrial no período de março/2026. " +
      "Fornecedor: CleanPro Ltda. Valor: R$ 2.300,00.",
    files: [
      { filename: "nfe-cleanpro-marco.pdf", mimeType: "application/pdf", content: PDF_CONTENT },
    ],
    decisionFields: [
      {
        id: "aprovador_financeiro",
        type: "select",
        label: "Aprovador financeiro",
        required: true,
        options: [
          { id: "cfo", label: "CFO" },
          { id: "gerente", label: "Gerente Financeiro" },
        ],
      },
    ],
    resolveAs: {
      status: "approved",
      comment: "NF conferida e dentro do contrato vigente.",
      decisionValues: { aprovador_financeiro: "gerente" },
    },
  },
  ]
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!N8N_SECRET) throw new Error("N8N_WEBHOOK_SECRET não definido em .env.local")

  const { db } = await import("../src/lib/db")
  const { organizations, organizationMembers, approvals: approvalsTable } = await import("../db/schema")
  const { eq } = await import("drizzle-orm")

  let orgId: string
  let n8nSlug: string

  if (ORG_ID) {
    const [org] = await db
      .select({ id: organizations.id, n8nSlug: organizations.n8nSlug })
      .from(organizations)
      .where(eq(organizations.id, ORG_ID))
    if (!org) throw new Error(`Org ${ORG_ID} não encontrada no banco`)
    if (!org.n8nSlug) throw new Error(`Org ${ORG_ID} sem n8nSlug configurado`)
    orgId = org.id
    n8nSlug = org.n8nSlug
  } else {
    const slug = process.env.SEED_N8N_SLUG
    if (!slug) throw new Error("Defina INT_TEST_ORG_ID ou SEED_N8N_SLUG")
    const [org] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.n8nSlug, slug))
    if (!org) throw new Error(`Org com slug "${slug}" não encontrada no banco`)
    orgId = org.id
    n8nSlug = slug
  }

  // Busca um userId real da org para resolvedBy nas aprovações pré-resolvidas
  const [firstMember] = await db
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(eq(organizationMembers.organizationId, orgId))
  const resolvedByUserId = firstMember?.userId ?? null

  console.log(`\nServidor : ${BASE_URL}`)
  console.log(`Org slug : ${n8nSlug}\n`)

  await cleanup(orgId)

  const docxContent = await buildDocx()
  const approvals = buildApprovals(docxContent)
  const urls: string[] = []

  for (const [i, spec] of approvals.entries()) {
    console.log(`[${i + 1}/${approvals.length}] ${spec.title}`)
    const approvalId = await createApproval(n8nSlug, spec)

    if (spec.resolveAs && resolvedByUserId) {
      await db
        .update(approvalsTable)
        .set({
          status: spec.resolveAs.status,
          resolvedBy: resolvedByUserId,
          resolvedAt: new Date(),
          comment: spec.resolveAs.comment,
          decisionValues: spec.resolveAs.decisionValues ?? null,
          updatedAt: new Date(),
        })
        .where(eq(approvalsTable.id, approvalId))
      console.log(`    ✓ ${spec.resolveAs.status}\n`)
    } else {
      console.log(`    ✓ criada\n`)
    }

    const url = `${BASE_URL}/approvals/${approvalId}`
    urls.push(`[${spec.resolveAs?.status ?? "pending"}] ${url}`)
  }

  console.log("─────────────────────────────────────────────")
  for (const url of urls) console.log(`  ${url}`)
  console.log("─────────────────────────────────────────────\n")
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\nErro:", err.message)
    process.exit(1)
  })
