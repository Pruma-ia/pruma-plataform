import { db } from "@/lib/db"
import { organizations, organizationMembers, flows, approvals } from "../../../../db/schema"
import { eq, count, sql } from "drizzle-orm"
import Link from "next/link"
import { Building2, ChevronRight, Users, GitBranch, CheckSquare } from "lucide-react"
import Image from "next/image"

export default async function AdminPage() {
  const orgs = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      subscriptionStatus: organizations.subscriptionStatus,
      asaasPlanId: organizations.asaasPlanId,
      createdAt: organizations.createdAt,
      memberCount: count(organizationMembers.id),
    })
    .from(organizations)
    .leftJoin(organizationMembers, eq(organizationMembers.organizationId, organizations.id))
    .groupBy(organizations.id)
    .orderBy(organizations.createdAt)

  const statusColors: Record<string, string> = {
    active: "bg-[#E0F6FE] text-[#00AEEF]",
    trial: "bg-[#E0F6FE] text-[#0D1B4B]",
    past_due: "bg-amber-50 text-amber-600",
    canceled: "bg-red-50 text-red-600",
    inactive: "bg-muted text-muted-foreground",
  }

  const statusLabels: Record<string, string> = {
    active: "Ativo",
    trial: "Trial",
    past_due: "Em atraso",
    canceled: "Cancelado",
    inactive: "Inativo",
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-16 items-center justify-between border-b bg-background px-6">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="Pruma IA" width={100} height={32} className="h-8 w-auto" />
          <span className="rounded-full bg-[#0D1B4B] px-2.5 py-0.5 text-xs font-medium text-white">
            Painel Admin
          </span>
        </div>
        <p className="text-sm text-muted-foreground">Acesso somente leitura</p>
      </header>

      <main className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Organizações</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {orgs.length} {orgs.length === 1 ? "cliente cadastrado" : "clientes cadastrados"}
          </p>
        </div>

        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b px-6 py-4">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold">Todas as organizações</h2>
          </div>
          <div className="divide-y">
            {orgs.length === 0 && (
              <p className="px-6 py-12 text-center text-sm text-muted-foreground">
                Nenhuma organização cadastrada.
              </p>
            )}
            {orgs.map((org) => (
              <Link
                key={org.id}
                href={`/admin/orgs/${org.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E0F6FE] text-[#0D1B4B] font-bold text-sm">
                    {org.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{org.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {org.slug} · criado em {new Date(org.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {org.memberCount}
                  </div>
                  {org.asaasPlanId && (
                    <span className="text-xs font-medium capitalize text-muted-foreground">
                      {org.asaasPlanId}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[org.subscriptionStatus]}`}
                  >
                    {statusLabels[org.subscriptionStatus]}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
