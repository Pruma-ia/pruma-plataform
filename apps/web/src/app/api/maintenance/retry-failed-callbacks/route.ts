import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { approvals, users } from "../../../../../db/schema"
import { eq, and, lt, isNotNull, sql } from "drizzle-orm"
import { timingSafeEqual } from "crypto"
import { validateCallbackUrl } from "@/lib/n8n"

const MAX_RETRIES = 5
// Janela máxima: não tenta callbacks de aprovações resolvidas há mais de 48h
// (n8n provavelmente já cancelou a execução em espera)
const MAX_AGE_HOURS = 48

// GET /api/maintenance/retry-failed-callbacks
// Reenvia callbacks que falharam, até MAX_RETRIES tentativas por approval.
// Acionado pelo Vercel Cron a cada 15 minutos.
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

  const cutoff = new Date()
  cutoff.setHours(cutoff.getHours() - MAX_AGE_HOURS)

  const pending = await db
    .select({
      id: approvals.id,
      status: approvals.status,
      callbackUrl: approvals.callbackUrl,
      callbackRetries: approvals.callbackRetries,
      comment: approvals.comment,
      resolvedAt: approvals.resolvedAt,
      resolverEmail: users.email,
    })
    .from(approvals)
    .leftJoin(users, eq(approvals.resolvedBy, users.id))
    .where(
      and(
        eq(approvals.callbackStatus, "failed"),
        lt(approvals.callbackRetries, MAX_RETRIES),
        isNotNull(approvals.callbackUrl),
        isNotNull(approvals.resolvedAt),
        // Só tenta approvals resolvidas dentro da janela de 48h
        sql`${approvals.resolvedAt} > ${cutoff}`
      )
    )
    .limit(50)

  const results = { sent: 0, failed: 0, exhausted: 0, blocked: 0 }

  for (const approval of pending) {
    if (!approval.callbackUrl) continue

    if (!validateCallbackUrl(approval.callbackUrl)) {
      await db
        .update(approvals)
        .set({ callbackStatus: "blocked", updatedAt: new Date() })
        .where(eq(approvals.id, approval.id))
      results.blocked++
      continue
    }

    const ok = await fetch(approval.callbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        approvalId: approval.id,
        status: approval.status,
        resolvedBy: approval.resolverEmail ?? null,
        comment: approval.comment,
        resolvedAt: approval.resolvedAt?.toISOString(),
        retried: true,
      }),
    })
      .then((r) => r.ok)
      .catch(() => false)

    const nextRetries = approval.callbackRetries + 1

    if (ok) {
      await db
        .update(approvals)
        .set({ callbackStatus: "sent", callbackRetries: nextRetries, updatedAt: new Date() })
        .where(eq(approvals.id, approval.id))
      results.sent++
    } else if (nextRetries >= MAX_RETRIES) {
      await db
        .update(approvals)
        .set({ callbackStatus: "exhausted", callbackRetries: nextRetries, updatedAt: new Date() })
        .where(eq(approvals.id, approval.id))
      results.exhausted++
    } else {
      await db
        .update(approvals)
        .set({ callbackRetries: nextRetries, updatedAt: new Date() })
        .where(eq(approvals.id, approval.id))
      results.failed++
    }
  }

  return NextResponse.json({ ok: true, processed: pending.length, ...results })
}
