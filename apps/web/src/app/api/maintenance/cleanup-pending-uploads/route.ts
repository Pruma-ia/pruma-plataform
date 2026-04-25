import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { approvalFileUploads } from "../../../../../db/schema"
import { and, eq, lt, inArray } from "drizzle-orm"
import { timingSafeEqual } from "crypto"
import { deleteObject } from "@/lib/r2"

// GET /api/maintenance/cleanup-pending-uploads
// Deleta uploads "pending" com expiresAt no passado: remove do R2 e do DB.
// Acionado pelo Vercel Cron diariamente às 04:00 UTC.
// Protegido por MAINTENANCE_SECRET.
export async function GET(req: Request) {
  const secret = req.headers.get("x-maintenance-secret")
  const expected = process.env.MAINTENANCE_SECRET
  if (!secret || !expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    if (!timingSafeEqual(Buffer.from(secret), Buffer.from(expected))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()

  const expired = await db
    .select({ id: approvalFileUploads.id, r2Key: approvalFileUploads.r2Key })
    .from(approvalFileUploads)
    .where(and(eq(approvalFileUploads.status, "pending"), lt(approvalFileUploads.expiresAt, now)))

  const deletedIds: string[] = []
  let failedR2 = 0

  for (const upload of expired) {
    try {
      await deleteObject(upload.r2Key)
      deletedIds.push(upload.id)
    } catch {
      failedR2++
    }
  }

  let deletedDb = 0
  if (deletedIds.length > 0) {
    const rows = await db
      .delete(approvalFileUploads)
      .where(inArray(approvalFileUploads.id, deletedIds))
      .returning()
    deletedDb = rows.length
  }

  return NextResponse.json({ ok: true, expired: expired.length, deletedR2: deletedIds.length, failedR2, deletedDb })
}
