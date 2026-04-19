import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { organizationMembers, users } from "../../../../../db/schema"
import { eq } from "drizzle-orm"
import { Header } from "@/components/dashboard/header"
import { InviteMemberForm } from "./invite-form"
import { MemberRow } from "./member-row"

export default async function MembersPage() {
  const session = await auth()
  const orgId = session!.user.organizationId!

  const members = await db
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
    .where(eq(organizationMembers.organizationId, orgId))

  const canManage = ["owner", "admin"].includes(session!.user.role ?? "")

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
      </div>
    </div>
  )
}
