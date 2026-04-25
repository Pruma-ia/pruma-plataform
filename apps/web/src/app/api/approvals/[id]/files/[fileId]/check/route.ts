import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { approvals, approvalFiles } from "../../../../../../../../db/schema"
import { eq, and } from "drizzle-orm"
import { objectExists } from "@/lib/r2"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  const session = await auth()
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id, fileId } = await params

  const [approval] = await db
    .select({ id: approvals.id })
    .from(approvals)
    .where(and(eq(approvals.id, id), eq(approvals.organizationId, session.user.organizationId)))

  if (!approval) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const [file] = await db
    .select({ r2Key: approvalFiles.r2Key })
    .from(approvalFiles)
    .where(and(eq(approvalFiles.id, fileId), eq(approvalFiles.approvalId, id)))

  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const exists = await objectExists(file.r2Key)
  return NextResponse.json({ exists }, { status: exists ? 200 : 404 })
}
