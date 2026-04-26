import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

// Rate limiter em memória por instância.
// Para múltiplas instâncias (Vercel production): migrar para Vercel KV ou @upstash/ratelimit.
const authRateMap = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = authRateMap.get(ip)
  if (!entry || now > entry.resetAt) {
    authRateMap.set(ip, { count: 1, resetAt: now + windowMs })
    return false
  }
  if (entry.count >= limit) return true
  entry.count++
  return false
}

// Rotas do dashboard que exigem assinatura ativa
const GUARDED_PREFIXES = ["/dashboard", "/flows", "/approvals", "/settings"]
const BLOCKED_STATUSES = new Set(["canceled", "inactive"])

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // ── Rate limiting em endpoints de autenticação ─────────────────────────────
  if (
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/n8n/") ||
    pathname === "/api/user/password"
  ) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
    if (isRateLimited(ip, 20, 60_000)) {
      return new NextResponse("Too Many Requests", { status: 429 })
    }
  }

  // ── Onboarding guard — usuário Google sem org ─────────────────────────────
  if (session && !session.user.isSuperAdmin && !session.user.organizationId) {
    if (!pathname.startsWith("/onboarding") && pathname !== "/api/auth/onboarding") {
      return NextResponse.redirect(new URL("/onboarding", req.url))
    }
  }
  if (pathname.startsWith("/onboarding") && session?.user.organizationId) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // ── Proteção do painel admin ───────────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    if (!session.user.isSuperAdmin) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
  }

  // ── Subscription guard — bloqueia acesso ao dashboard para contas canceladas ─
  const isGuardedRoute = GUARDED_PREFIXES.some((p) => pathname.startsWith(p))
  if (isGuardedRoute && session && !session.user.isSuperAdmin) {
    const status = session.user.subscriptionStatus
    if (status && BLOCKED_STATUSES.has(status)) {
      return NextResponse.redirect(new URL("/billing", req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/admin/:path*",
    "/onboarding/:path*",
    "/onboarding",
    "/dashboard/:path*",
    "/flows/:path*",
    "/approvals/:path*",
    "/settings/:path*",
    "/api/auth/:path*",
    "/api/n8n/:path*",
    "/api/user/:path*",
  ],
}
