import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { organizations } from "../../../../../db/schema"
import { eq } from "drizzle-orm"
import { notFound } from "next/navigation"
import { Header } from "@/components/dashboard/header"
import { OrgProfileFormSettings } from "./org-profile-form-settings"

export default async function OrganizationSettingsPage() {
  const session = await auth()
  const orgId = session?.user?.organizationId
  if (!orgId) return notFound()

  const [org] = await db
    .select({
      cnpj: organizations.cnpj,
      phone: organizations.phone,
      addressStreet: organizations.addressStreet,
      addressNumber: organizations.addressNumber,
      addressComplement: organizations.addressComplement,
      addressZipCode: organizations.addressZipCode,
      addressCity: organizations.addressCity,
      addressState: organizations.addressState,
    })
    .from(organizations)
    .where(eq(organizations.id, orgId))

  const canEdit = ["owner", "admin"].includes(session!.user.role ?? "")

  return (
    <div>
      <Header title="Dados da organização" />
      <div className="flex justify-center p-6 pt-8">
        <div className="w-full max-w-lg rounded-xl border bg-card p-8 shadow-sm">
          <h2 className="text-base font-semibold mb-6">Cadastro</h2>
          {canEdit ? (
            <OrgProfileFormSettings initialData={org ?? undefined} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Apenas owner ou admin podem editar dados da organização.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
