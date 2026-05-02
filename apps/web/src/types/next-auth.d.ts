import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      isSuperAdmin?: boolean
      organizationId?: string
      organizationSlug?: string
      role?: "owner" | "admin" | "member" | "viewer"
      subscriptionStatus?: "active" | "trial" | "past_due" | "canceled" | "inactive"
      emailVerified?: boolean
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    isSuperAdmin?: boolean
    organizationId?: string
    organizationSlug?: string
    role?: "owner" | "admin" | "member" | "viewer"
    subscriptionStatus?: "active" | "trial" | "past_due" | "canceled" | "inactive"
    emailVerified?: boolean
    /** Timestamp da última sincronização com o banco (ms). Usado para refresh de subscriptionStatus. */
    refreshedAt?: number
  }
}
