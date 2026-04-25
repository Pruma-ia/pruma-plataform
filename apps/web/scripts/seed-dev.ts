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

// DOCX/XLSX: ZIP magic bytes + padding — valid upload, not parseable as Office doc
// Tests file type icon and download flow; not for content rendering
const DOCX_CONTENT = Buffer.concat([
  Buffer.from([0x50, 0x4b, 0x03, 0x04]), // PK\x03\x04 ZIP local file header
  Buffer.alloc(64, 0),
])
const XLSX_CONTENT = Buffer.concat([
  Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  Buffer.alloc(64, 0),
])

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
}

type ApprovalSpec = {
  title: string
  description: string
  files: FileSpec[]
  decisionFields: DecisionField[]
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

const APPROVALS: ApprovalSpec[] = [
  {
    title: "Aprovação de Contrato (seed)",
    description: "Contrato de prestação de serviços — validação visual PDF + DOCX",
    files: [
      { filename: "contrato-servicos.pdf", mimeType: "application/pdf", content: PDF_CONTENT },
      {
        filename: "proposta-comercial.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        content: DOCX_CONTENT,
      },
    ],
    decisionFields: [
      {
        id: "advogado",
        type: "select",
        label: "Advogado responsável",
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
        options: [
          { id: "q1", label: "Q1 2026" },
          { id: "q2", label: "Q2 2026" },
          { id: "q3", label: "Q3 2026" },
          { id: "q4", label: "Q4 2026" },
        ],
      },
    ],
  },
]

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!N8N_SECRET) throw new Error("N8N_WEBHOOK_SECRET não definido em .env.local")

  const { db } = await import("../src/lib/db")
  const { organizations } = await import("../db/schema")
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

  console.log(`\nServidor : ${BASE_URL}`)
  console.log(`Org slug : ${n8nSlug}\n`)

  await cleanup(orgId)

  const urls: string[] = []

  for (const [i, spec] of APPROVALS.entries()) {
    console.log(`[${i + 1}/${APPROVALS.length}] ${spec.title}`)
    const approvalId = await createApproval(n8nSlug, spec)
    const url = `${BASE_URL}/approvals/${approvalId}`
    urls.push(url)
    console.log(`    ✓ criada\n`)
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
