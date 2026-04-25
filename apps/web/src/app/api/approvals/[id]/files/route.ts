import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { approvals, approvalFiles } from "../../../../../../db/schema"
import { eq, and } from "drizzle-orm"
import { presignReadUrl } from "@/lib/r2"

// GET /api/approvals/[id]/files
// Retorna metadados + signed URLs (1h) dos arquivos de uma aprovação.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const [approval] = await db
    .select({ id: approvals.id })
    .from(approvals)
    .where(and(eq(approvals.id, id), eq(approvals.organizationId, session.user.organizationId)))

  if (!approval) {
    return NextResponse.json({ error: "Approval not found" }, { status: 404 })
  }

  const files = await db
    .select({
      id: approvalFiles.id,
      filename: approvalFiles.filename,
      mimeType: approvalFiles.mimeType,
      sizeBytes: approvalFiles.sizeBytes,
      r2Key: approvalFiles.r2Key,
    })
    .from(approvalFiles)
    .where(eq(approvalFiles.approvalId, id))

  const filesWithUrls = await Promise.all(
    files.map(async (f) => ({
      id: f.id,
      filename: f.filename,
      mimeType: f.mimeType,
      sizeBytes: f.sizeBytes,
      url: await presignReadUrl(f.r2Key),
    }))
  )

  return NextResponse.json({ files: filesWithUrls })
}
