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
      /** Boolean form of users.emailVerified — true when DB timestamp is non-null */
      emailVerified?: boolean
      /** True when organizations.cnpj IS NOT NULL for the user's org. Computed in jwt callback. */
      orgCnpjFilled?: boolean
    } & Omit<NonNullable<DefaultSession["user"]>, "emailVerified">
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
    /** True when organizations.cnpj IS NOT NULL for the user's org. Re-evaluated after update(). */
    orgCnpjFilled?: boolean
    /** Timestamp da última sincronização com o banco (ms). Usado para refresh de subscriptionStatus. */
    refreshedAt?: number
  }
}
