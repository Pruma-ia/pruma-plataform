import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { authRatelimit, billingRatelimit } from "@/lib/ratelimit"

// Rotas do dashboard que exigem assinatura ativa
const GUARDED_PREFIXES = ["/dashboard", "/flows", "/approvals", "/settings"]
const BLOCKED_STATUSES = new Set(["canceled", "inactive"])

// emailVerified gate (D-01) — caminhos acessíveis enquanto não verificado.
//
// Estes caminhos são bypass obrigatórios para que o usuário possa:
//   - Visualizar a página de verificação (/verify-email)
//   - Verificar o código OTP (/api/auth/verify-otp)
//   - Reenviar o código OTP (/api/auth/resend-otp)
//   - Fazer logout (/api/auth/signout) sem precisar verificar
//
// Todos os outros caminhos /api/auth/* (signin, callback, csrf, session) também
// são bypass para que o usuário possa re-autenticar ou sair enquanto não verificado.
//
// ORDEM DE GUARDS (importante):
//   1. Rate limiting (INFRA-01)
//   2. Onboarding guard (usuário sem org → /onboarding)
//   3. emailVerified gate (usuário com org mas sem e-mail verificado → /verify-email)
//   4. CNPJ guard (usuário verificado mas sem CNPJ → /onboarding/cadastral) [D-10 / ORG-02]
//   5. Admin guard
//   6. Subscription guard
//
// Nota: o gate emailVerified roda DEPOIS do onboarding guard porque, no fluxo de
// registro, o usuário é criado com emailVerified=null antes de ter uma org.
// Sem org, o onboarding guard trata — o emailVerified gate não deve interferir.

const EMAIL_VERIFY_BYPASS = new Set([
  "/verify-email",
  "/api/auth/verify-otp",
  "/api/auth/resend-otp",
  "/api/auth/signout",
])

function isEmailVerifyBypass(pathname: string): boolean {
  if (EMAIL_VERIFY_BYPASS.has(pathname)) return true
  // All /api/auth/* paths bypass the email gate (signin, callback, csrf, session, etc.).
  // Email gate requires organizationId — onboarding users never have one, so they're
  // handled by the onboarding guard before this function is reached.
  if (pathname.startsWith("/api/auth/")) return true
  return false
}

export default auth(async (req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // ── Design preview — somente em desenvolvimento ─────────────────────────
  if (pathname.startsWith("/design-preview") && process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 })
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"

  // ── Rate limiting em endpoints de autenticação (Upstash; INFRA-01) ──────
  // Substitui authRateMap + isRateLimited em-memória por singleton Upstash.
  // Cobre: todos os fluxos de auth, n8n webhooks e alteração de senha.
  if (
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/n8n/") ||
    pathname === "/api/user/password"
  ) {
    const { success } = await authRatelimit.limit(ip)
    if (!success) {
      return new NextResponse("Too Many Requests", { status: 429 })
    }
  }

  // ── Rate limiting em billing (Upstash; INFRA-01) ─────────────────────────
  // Substitui billingRateMap + isRateLimited em-memória por singleton Upstash.
  if (
    pathname === "/api/billing/checkout" ||
    pathname === "/api/billing/unified-checkout" ||
    pathname === "/api/billing/setup-charge/pay"
  ) {
    const { success } = await billingRatelimit.limit(ip)
    if (!success) {
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

  // ── EmailVerified gate (D-01; AUTH-01) ──────────────────────────────────
  // Usuário autenticado, tem org, NÃO verificou e-mail → redireciona para /verify-email.
  // Pula caminhos do bypass para que o usuário possa verificar, reenviar ou sair.
  // Superadmin é isento (acesso irrestrito ao admin panel sem org).
  if (
    session &&
    !session.user.isSuperAdmin &&
    session.user.organizationId &&
    session.user.emailVerified === false &&
    !isEmailVerifyBypass(pathname)
  ) {
    return NextResponse.redirect(new URL("/verify-email", req.url))
  }

  // Usuário verificado que acessa /verify-email diretamente → envia ao /dashboard.
  if (
    pathname === "/verify-email" &&
    session?.user.emailVerified === true &&
    session.user.organizationId
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // ── CNPJ guard (D-10 / ORG-02 / ORG-03) — verificado mas sem CNPJ → /onboarding/cadastral ──
  // Roda DEPOIS do emailVerified gate (usuário deve estar verificado antes de ser
  // cobrado pelo CNPJ). Superadmin é isento (acesso irrestrito). Bypass obrigatório
  // para que o usuário possa preencher o formulário e fazer logout sem loop.
  const CADASTRAL_BYPASS = new Set([
    "/onboarding/cadastral",
    "/api/auth/signout",
  ])
  function isCadastralBypass(p: string): boolean {
    if (CADASTRAL_BYPASS.has(p)) return true
    if (p.startsWith("/api/auth/")) return true
    if (p.startsWith("/api/user/org-profile")) return true
    return false
  }
  if (
    session &&
    !session.user.isSuperAdmin &&
    session.user.organizationId &&
    session.user.emailVerified === true &&
    session.user.orgCnpjFilled === false &&
    !isCadastralBypass(pathname)
  ) {
    return NextResponse.redirect(new URL("/onboarding/cadastral", req.url))
  }

  // ── Proteção do painel admin ─────────────────────────────────────────────
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
    "/onboarding/cadastral",
    "/dashboard/:path*",
    "/flows/:path*",
    "/approvals/:path*",
    "/settings/:path*",
    "/billing",
    "/billing/:path*",
    "/verify-email",
    "/api/auth/:path*",
    "/api/auth/verify-otp",
    "/api/auth/resend-otp",
    "/api/n8n/:path*",
    "/api/user/:path*",
    "/api/billing/checkout",
    "/api/billing/unified-checkout",
    "/api/billing/setup-charge/pay",
  ],
}
