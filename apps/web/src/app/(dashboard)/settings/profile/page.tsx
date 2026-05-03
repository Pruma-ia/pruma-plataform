import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { users } from "../../../../../db/schema"
import { eq } from "drizzle-orm"
import { redirect } from "next/navigation"
import { Header } from "@/components/dashboard/header"
import { getOrgHeaderData } from "@/lib/org-header-data"
import { getConnectedAccounts } from "@/lib/connected-accounts"
import { PasswordForm } from "./password-form"
import { ProfileDisplayNameForm } from "./profile-display-name-form"
import { ConnectedAccountsList } from "./connected-accounts-list"

export default async function ProfilePage() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) redirect("/login")

  const orgId = session.user.organizationId

  const [[user], connectedAccounts, header] = await Promise.all([
    db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
    getConnectedAccounts(userId),
    orgId
      ? getOrgHeaderData(orgId)
      : Promise.resolve({ name: "", logoUrl: null }),
  ])

  return (
    <div>
      <Header title="Meu perfil" orgName={header.name} orgLogoUrl={header.logoUrl} />
      <div className="flex flex-col items-center gap-6 p-6 pt-8">
        {/* Identity card — display name + email */}
        <div className="w-full max-w-lg rounded-xl border bg-card p-8 shadow-sm">
          <h2 className="text-base font-semibold mb-6">Identidade</h2>
          <ProfileDisplayNameForm
            initialName={user?.name ?? ""}
            email={user?.email ?? ""}
          />
        </div>

        {/* Connected accounts — view-only, no disconnect (PROF-02) */}
        <div className="w-full max-w-lg rounded-xl border bg-card p-8 shadow-sm">
          <h2 className="text-base font-semibold mb-6">Contas conectadas</h2>
          <ConnectedAccountsList accounts={connectedAccounts} />
        </div>

        {/* Password card — existing form preserved */}
        <div className="w-full max-w-lg rounded-xl border bg-card p-8 shadow-sm">
          <h2 className="text-base font-semibold mb-6">Senha</h2>
          <PasswordForm />
        </div>
      </div>
    </div>
  )
}
