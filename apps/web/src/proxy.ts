import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register")
  const isDashboard = pathname.startsWith("/dashboard") ||
    pathname.startsWith("/flows") ||
    pathname.startsWith("/approvals") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/billing")

  if (isDashboard && !session) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (isAuthPage && session) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/flows/:path*",
    "/approvals/:path*",
    "/settings/:path*",
    "/billing/:path*",
    "/login",
    "/register",
  ],
}
