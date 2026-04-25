/**
 * Seed script para debug visual do fluxo de aprovações ricas.
 *
 * Faz o que o n8n faria:
 *   1. Presign → obtém uploadUrl + r2Key do servidor local
 *   2. PUT real no MinIO com arquivo de exemplo
 *   3. Cria aprovação com arquivo e decisionFields
 *   4. Imprime URL para abrir no browser
 *
 * Requer: npm run dev rodando + MinIO rodando (docker compose up -d minio minio-init)
 *
 * Uso:
 *   INT_TEST_ORG_ID=<uuid> npm run seed:dev
 *   SEED_N8N_SLUG=<slug>   npm run seed:dev
 */
import { config } from "dotenv"
import path from "path"

// Carrega .env.local antes de qualquer acesso a process.env
config({ path: path.resolve(process.cwd(), ".env.local") })

const BASE_URL = process.env.SEED_BASE_URL ?? "http://localhost:3000"
const N8N_SECRET = process.env.N8N_WEBHOOK_SECRET ?? ""
const ORG_ID = process.env.INT_TEST_ORG_ID

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

async function main() {
  if (!N8N_SECRET) throw new Error("N8N_WEBHOOK_SECRET não definido em .env.local")

  // Imports dinâmicos dentro de main() — após dotenv ter carregado DATABASE_URL
  let n8nSlug: string
  if (ORG_ID) {
    const { db } = await import("../src/lib/db")
    const { organizations } = await import("../db/schema")
    const { eq } = await import("drizzle-orm")
    const [org] = await db
      .select({ n8nSlug: organizations.n8nSlug })
      .from(organizations)
      .where(eq(organizations.id, ORG_ID))
    if (!org) throw new Error(`Org ${ORG_ID} não encontrada no banco`)
    if (!org.n8nSlug) throw new Error(`Org ${ORG_ID} sem n8nSlug configurado`)
    n8nSlug = org.n8nSlug
  } else {
    const slug = process.env.SEED_N8N_SLUG
    if (!slug) throw new Error("Defina INT_TEST_ORG_ID ou SEED_N8N_SLUG")
    n8nSlug = slug
  }

  console.log(`\nServidor : ${BASE_URL}`)
  console.log(`Org slug : ${n8nSlug}\n`)

  // 1. Presign
  const presignRes = await fetch(`${BASE_URL}/api/n8n/approvals/files/presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-n8n-secret": N8N_SECRET },
    body: JSON.stringify({
      organizationSlug: n8nSlug,
      filename: "contrato-exemplo.pdf",
      mimeType: "application/pdf",
      sizeBytes: PDF_CONTENT.byteLength,
    }),
  })
  if (!presignRes.ok) throw new Error(`Presign falhou (${presignRes.status}): ${await presignRes.text()}`)
  const { uploadUrl, r2Key } = await presignRes.json()
  console.log(`[1] Presign OK`)
  console.log(`    r2Key: ${r2Key}`)

  // 2. PUT real no MinIO
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/pdf", "Content-Length": String(PDF_CONTENT.byteLength) },
    body: PDF_CONTENT,
  })
  if (!putRes.ok) throw new Error(`PUT MinIO falhou (${putRes.status}): ${await putRes.text()}`)
  console.log(`[2] Upload MinIO OK`)

  // 3. Criar aprovação
  const approvalRes = await fetch(`${BASE_URL}/api/n8n/approvals`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-n8n-secret": N8N_SECRET },
    body: JSON.stringify({
      organizationSlug: n8nSlug,
      n8nExecutionId: `seed-${Date.now()}`,
      callbackUrl: "https://n8n.callback.test/webhook/seed",
      title: "Aprovação de Contrato (seed)",
      description: "Criado pelo script seed-dev para validação visual",
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
      ],
      files: [
        {
          r2Key,
          filename: "contrato-exemplo.pdf",
          mimeType: "application/pdf",
          sizeBytes: PDF_CONTENT.byteLength,
        },
      ],
    }),
  })
  if (!approvalRes.ok) throw new Error(`Criar aprovação falhou (${approvalRes.status}): ${await approvalRes.text()}`)
  const { approvalId } = await approvalRes.json()
  console.log(`[3] Aprovação criada`)

  console.log(`\n─────────────────────────────────────────────`)
  console.log(`  ${BASE_URL}/approvals/${approvalId}`)
  console.log(`─────────────────────────────────────────────\n`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\nErro:", err.message)
    process.exit(1)
  })
