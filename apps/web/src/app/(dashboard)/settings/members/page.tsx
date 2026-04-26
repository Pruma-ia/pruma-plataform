import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { organizationMembers, organizations, users } from "../../../../../db/schema"
import { eq } from "drizzle-orm"
import { Header } from "@/components/dashboard/header"
import { InviteMemberForm } from "./invite-form"
import { MemberRow } from "./member-row"

export default async function MembersPage() {
  const session = await auth()
  const orgId = session!.user.organizationId!

  const [members, org] = await Promise.all([
    db
      .select({
        memberId: organizationMembers.id,
        role: organizationMembers.role,
        joinedAt: organizationMembers.acceptedAt,
        userId: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(eq(organizationMembers.organizationId, orgId)),
    db
      .select({ id: organizations.id, slug: organizations.slug, n8nSlug: organizations.n8nSlug })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .then((r) => r[0]),
  ])

  const canManage = ["owner", "admin"].includes(session!.user.role ?? "")
  const isDev = process.env.NODE_ENV === "development"

  return (
    <div>
      <Header title="Equipe" />
      <div className="p-6 space-y-6">
        {canManage && <InviteMemberForm />}

        <div className="rounded-xl border bg-card shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold">Membros ({members.length})</h2>
          </div>
          <div className="divide-y">
            {members.map((m) => (
              <MemberRow
                key={m.memberId}
                member={m}
                currentUserId={session!.user.id}
                canManage={canManage}
              />
            ))}
          </div>
        </div>

        {isDev && org && (
          <div className="rounded-xl border border-dashed border-yellow-400/60 bg-yellow-50/40 dark:bg-yellow-950/20 p-4 space-y-2">
            <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 uppercase tracking-wide">
              Dev — identifiers da org
            </p>
            <div className="font-mono text-xs space-y-1 text-muted-foreground">
              <p><span className="text-yellow-700 dark:text-yellow-400">INT_TEST_ORG_ID</span>={org.id}</p>
              <p><span className="text-yellow-700 dark:text-yellow-400">INT_TEST_USER_ID</span>={session!.user.id}</p>
              <p><span className="text-yellow-700 dark:text-yellow-400">slug</span>={org.slug}</p>
              <p><span className="text-yellow-700 dark:text-yellow-400">n8nSlug</span>={org.n8nSlug ?? "—"}</p>
            </div>
            <p className="text-[10px] text-muted-foreground/60">
              Só aparece em NODE_ENV=development
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
