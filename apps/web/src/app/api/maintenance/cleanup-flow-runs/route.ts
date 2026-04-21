import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { flowRuns } from "../../../../../db/schema"
import { lt } from "drizzle-orm"
import { timingSafeEqual } from "crypto"

// GET /api/maintenance/cleanup-flow-runs
// Deleta flowRuns mais antigos que FLOW_RUN_RETENTION_DAYS (padrão: 90 dias).
// Acionado pelo Vercel Cron (vercel.json) diariamente às 03:00 UTC.
// Protegido por MAINTENANCE_SECRET para impedir chamadas não autorizadas.
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

  const retentionDays = parseInt(process.env.FLOW_RUN_RETENTION_DAYS ?? "90")
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - retentionDays)

  const deleted = await db
    .delete(flowRuns)
    .where(lt(flowRuns.createdAt, cutoff))
    .returning()

  return NextResponse.json({
    ok: true,
    deleted: deleted.length,
    cutoff: cutoff.toISOString(),
    retentionDays,
  })
}
