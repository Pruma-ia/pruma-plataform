import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

// Rate limiter em memória por instância.
// Para múltiplas instâncias (Vercel production): migrar para Vercel KV ou @upstash/ratelimit.
const authRateMap = new Map<string, { count: number; resetAt: number }>()
const billingRateMap = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(
  map: Map<string, { count: number; resetAt: number }>,
  ip: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now()
  const entry = map.get(ip)
  if (!entry || now > entry.resetAt) {
    map.set(ip, { count: 1, resetAt: now + windowMs })
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

  // ── Design preview — somente em desenvolvimento ────────────────────────────
  if (pathname.startsWith("/design-preview") && process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 })
  }

  // ── Rate limiting em endpoints de autenticação ─────────────────────────────
  if (
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/n8n/") ||
    pathname === "/api/user/password"
  ) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
    if (isRateLimited(authRateMap, ip, 20, 60_000)) {
      return new NextResponse("Too Many Requests", { status: 429 })
    }
  }

  // ── Rate limiting em billing — 5 req/min por IP ────────────────────────────
  if (pathname === "/api/billing/checkout") {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
    if (isRateLimited(billingRateMap, ip, 5, 60_000)) {
      return new NextResponse("Too Many Requests", { status: 429 })
    }
  }

  // ── Onboarding guard — usuário sem org: só /onboarding (step 1) liberado ──
  if (session && !session.user.isSuperAdmin && !session.user.organizationId) {
    if (pathname !== "/onboarding" && pathname !== "/api/auth/onboarding") {
      return NextResponse.redirect(new URL("/onboarding", req.url))
    }
  }
  // Step 1 já cumprido: redireciona /onboarding para /dashboard
  if (pathname === "/onboarding" && session?.user.organizationId) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }
  // Step 2 (/onboarding/org-profile): requer auth + org criada
  if (pathname.startsWith("/onboarding/org-profile")) {
    if (!session) return NextResponse.redirect(new URL("/login", req.url))
    if (!session.user.organizationId) return NextResponse.redirect(new URL("/onboarding", req.url))
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
  // /settings/organization liberado para contas bloqueadas: cliente precisa completar
  // CNPJ/endereço antes de assinar — sem isso o link na billing page resulta em loop.
  const isGuardedRoute = GUARDED_PREFIXES.some((p) => pathname.startsWith(p))
  const isSettingsOrgException = pathname.startsWith("/settings/organization")
  if (isGuardedRoute && !isSettingsOrgException && session && !session.user.isSuperAdmin) {
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
    "/api/billing/checkout",
  ],
}
