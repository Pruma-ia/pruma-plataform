import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      organizationId?: string
      organizationSlug?: string
      role?: "owner" | "admin" | "member" | "viewer"
      subscriptionStatus?: "active" | "trial" | "past_due" | "canceled" | "inactive"
    } & DefaultSession["user"]
  }
}
