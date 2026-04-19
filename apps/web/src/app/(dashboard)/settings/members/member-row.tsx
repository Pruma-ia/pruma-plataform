"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"

const roleLabels: Record<string, string> = {
  owner: "Dono",
  admin: "Admin",
  member: "Membro",
  viewer: "Visualizador",
}

type Member = {
  memberId: string
  role: string
  userId: string
  name: string | null
  email: string | null
  image: string | null
  joinedAt: Date | null
}

export function MemberRow({
  member,
  currentUserId,
  canManage,
}: {
  member: Member
  currentUserId: string
  canManage: boolean
}) {
  const [role, setRole] = useState(member.role)
  const [removed, setRemoved] = useState(false)

  async function changeRole(newRole: string) {
    setRole(newRole)
    await fetch(`/api/organizations/members/${member.memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    })
  }

  async function remove() {
    if (!confirm(`Remover ${member.name ?? member.email}?`)) return
    await fetch(`/api/organizations/members/${member.memberId}`, { method: "DELETE" })
    setRemoved(true)
  }

  if (removed) return null

  const isOwner = member.role === "owner"
  const isSelf = member.userId === currentUserId

  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-3">
        {member.image ? (
          <img src={member.image} alt="" className="h-9 w-9 rounded-full" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
            {(member.name ?? member.email ?? "?")[0].toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-sm font-medium">{member.name ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{member.email}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {canManage && !isOwner && !isSelf ? (
          <select
            value={role}
            onChange={(e) => changeRole(e.target.value)}
            className="rounded-lg border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="admin">Admin</option>
            <option value="member">Membro</option>
            <option value="viewer">Visualizador</option>
          </select>
        ) : (
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
            {roleLabels[role] ?? role}
          </span>
        )}

        {canManage && !isOwner && !isSelf && (
          <button
            onClick={remove}
            className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
