import { eq } from "drizzle-orm"
import { db } from "./db"
import { accounts, users } from "../../db/schema"

export interface ConnectedAccount {
  provider: string
  providerAccountId: string
}

/**
 * Returns all authentication providers connected to a user account.
 *
 * OAuth providers (Google, etc.) are read from the NextAuth `accounts` table.
 * Credentials (email + password) are inferred from users.password being set —
 * credentials logins never produce a row in the accounts table.
 *
 * Results are sorted alphabetically by provider, then by providerAccountId.
 * Call from Server Components only — do NOT import in client components.
 */
export async function getConnectedAccounts(userId: string): Promise<ConnectedAccount[]> {
  const [oauthRows, userRows] = await Promise.all([
    db
      .select({ provider: accounts.provider, providerAccountId: accounts.providerAccountId })
      .from(accounts)
      .where(eq(accounts.userId, userId)),
    db
      .select({ password: users.password })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
  ])

  const all: ConnectedAccount[] = [...oauthRows]

  const userRow = userRows[0]
  if (userRow?.password) {
    all.push({ provider: "credentials", providerAccountId: userId })
  }

  all.sort(
    (a, b) =>
      a.provider.localeCompare(b.provider) ||
      a.providerAccountId.localeCompare(b.providerAccountId)
  )

  return all
}
