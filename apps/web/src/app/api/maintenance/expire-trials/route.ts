import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { organizations } from "../../../../../db/schema"
import { and, eq, lt, isNotNull } from "drizzle-orm"
import { timingSafeEqual } from "crypto"

// GET /api/maintenance/expire-trials
// Move orgs com trial expirado (subscriptionEndsAt < now) para status "inactive".
// Acionado pelo Vercel Cron (vercel.json) diariamente às 05:00 UTC.
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
    .update(organizations)
    .set({ subscriptionStatus: "inactive", updatedAt: now })
    .where(
      and(
        eq(organizations.subscriptionStatus, "trial"),
        isNotNull(organizations.subscriptionEndsAt),
        lt(organizations.subscriptionEndsAt, now),
      )
    )
    .returning()

  return NextResponse.json({ expired: expired.length })
}
