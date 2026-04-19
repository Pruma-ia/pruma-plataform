import NextAuth from "next-auth"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { db } from "./db"
import { users, accounts, sessions, verificationTokens, organizationMembers, organizations } from "../../db/schema"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"

export const { handlers, auth, signIn, signOut } = NextAuth({
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
    async jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    async session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string

        // Carrega a organização ativa do usuário
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
          session.user.organizationId = membership.orgId
          session.user.organizationSlug = membership.orgSlug
          session.user.role = membership.role
          session.user.subscriptionStatus = membership.subscriptionStatus
        }
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
})
