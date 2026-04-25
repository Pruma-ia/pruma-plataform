import { S3Client, DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const BUCKET = process.env.R2_BUCKET ?? "pruma-dev"
const PRESIGN_UPLOAD_TTL = 600    // 10 min — tempo para n8n completar o PUT
const PRESIGN_READ_TTL  = 3600   // 1h  — tempo para aprovador visualizar o arquivo

export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

function getClient() {
  return new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT ?? "http://localhost:9000",
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "minioadmin",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "minioadmin",
    },
    forcePathStyle: true, // obrigatório para MinIO e R2 com endpoint customizado
  })
}

export function buildR2Key(orgId: string, filename: string): string {
  const uuid = crypto.randomUUID()
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100)
  return `${orgId}/${uuid}/${safe}`
}

export async function presignUploadUrl(r2Key: string, mimeType: string, sizeBytes: number) {
  const client = getClient()
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: r2Key,
    ContentType: mimeType,
    ContentLength: sizeBytes,
  })
  return getSignedUrl(client, command, { expiresIn: PRESIGN_UPLOAD_TTL })
}

export async function presignReadUrl(r2Key: string) {
  const { GetObjectCommand } = await import("@aws-sdk/client-s3")
  const client = getClient()
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: r2Key })
  return getSignedUrl(client, command, { expiresIn: PRESIGN_READ_TTL })
}

export async function deleteObject(r2Key: string) {
  const client = getClient()
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: r2Key }))
}
