import NextAuth from "next-auth"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { db } from "./db"
import { users, accounts, sessions, verificationTokens, organizationMembers, organizations } from "../../db/schema"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"

// subscriptionStatus é re-lido do banco a cada 5 minutos para refletir mudanças de billing
// sem precisar de nova query em toda request autenticada
const SUBSCRIPTION_REFRESH_MS = 5 * 60 * 1000

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email as string))

        if (!user?.password) return null

        const valid = await bcrypt.compare(credentials.password as string, user.password)
        if (!valid) return null

        return { id: user.id, email: user.email, name: user.name, image: user.image }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // Executa apenas no login inicial — carrega todos os claims no JWT
      if (user) {
        const userId = user.id as string
        token.id = userId

        // Backfill: user.image é o valor do banco (null para usuários pré-existentes).
        // profile.picture é a foto direta do Google — fonte correta para o backfill.
        const googlePicture = account?.provider === "google"
          ? (profile as { picture?: string } | undefined)?.picture
          : undefined
        if (googlePicture) {
          await db.update(users).set({ image: googlePicture }).where(eq(users.id, userId))
          token.picture = googlePicture
        }

        const [dbUser, membership] = await Promise.all([
          db
            .select({ isSuperAdmin: users.isSuperAdmin, emailVerified: users.emailVerified })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1)
            .then((r) => r[0]),
          db
            .select({
              orgId: organizations.id,
              orgName: organizations.name,
              orgSlug: organizations.slug,
              role: organizationMembers.role,
              subscriptionStatus: organizations.subscriptionStatus,
            })
            .from(organizationMembers)
            .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
            .where(eq(organizationMembers.userId, userId))
            .limit(1)
            .then((r) => r[0]),
        ])

        token.isSuperAdmin = dbUser?.isSuperAdmin ?? false
        // emailVerified: timestamp value in DB = verified; null = unverified
        token.emailVerified = dbUser?.emailVerified != null

        if (!dbUser?.isSuperAdmin && membership) {
          token.organizationId = membership.orgId
          token.organizationSlug = membership.orgSlug
          token.role = membership.role
          token.subscriptionStatus = membership.subscriptionStatus
        }

        token.refreshedAt = Date.now()
        return token
      }

      // Usuário Google sem org: busca membership criado no onboarding pós-OAuth
      if (!token.isSuperAdmin && !token.organizationId && token.id) {
        const [membership] = await db
          .select({
            orgId: organizations.id,
            orgName: organizations.name,
            orgSlug: organizations.slug,
            role: organizationMembers.role,
            subscriptionStatus: organizations.subscriptionStatus,
          })
          .from(organizationMembers)
          .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
          .where(eq(organizationMembers.userId, token.id as string))
          .limit(1)

        if (membership) {
          token.organizationId = membership.orgId
          token.organizationSlug = membership.orgSlug
          token.role = membership.role
          token.subscriptionStatus = membership.subscriptionStatus
          token.refreshedAt = Date.now()
        }

        return token
      }

      // Re-lê subscriptionStatus a cada 5 min para refletir mudanças de billing (Asaas webhook)
      if (
        !token.isSuperAdmin &&
        token.organizationId &&
        token.refreshedAt &&
        Date.now() - (token.refreshedAt as number) > SUBSCRIPTION_REFRESH_MS
      ) {
        const [org] = await db
          .select({ subscriptionStatus: organizations.subscriptionStatus })
          .from(organizations)
          .where(eq(organizations.id, token.organizationId as string))
          .limit(1)

        if (org) token.subscriptionStatus = org.subscriptionStatus
        token.refreshedAt = Date.now()
      }

      return token
    },

    async session({ session, token }) {
      // Apenas lê do JWT — sem queries ao banco
      session.user.id = token.id as string
      session.user.isSuperAdmin = (token.isSuperAdmin as boolean | undefined) ?? false
      session.user.organizationId = token.organizationId as string | undefined
      session.user.organizationSlug = token.organizationSlug as string | undefined
      session.user.role = token.role as "owner" | "admin" | "member" | "viewer" | undefined
      session.user.subscriptionStatus = token.subscriptionStatus as
        | "active"
        | "trial"
        | "past_due"
        | "canceled"
        | "inactive"
        | undefined
      // Cast required: DrizzleAdapter augments Session.user.emailVerified as Date|null;
      // our JWT carries a derived boolean. The intersection is resolved at runtime.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(session.user as any).emailVerified = (token.emailVerified as boolean | undefined) ?? false
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
})
