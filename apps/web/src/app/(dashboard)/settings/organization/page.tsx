import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { organizations } from "../../../../../db/schema"
import { eq } from "drizzle-orm"
import { redirect } from "next/navigation"
import { Header } from "@/components/dashboard/header"
import { getOrgHeaderData } from "@/lib/org-header-data"
import { presignReadUrl } from "@/lib/r2"
import { OrgProfileFormSettings } from "./org-profile-form-settings"
import { OrgIdentityForm } from "./org-identity-form"

export default async function OrganizationSettingsPage() {
  const session = await auth()
  const orgId = session?.user?.organizationId
  if (!orgId) redirect("/dashboard")

  const orgHeader = await getOrgHeaderData(orgId)

  const [org] = await db
    .select({
      name: organizations.name,
      logo: organizations.logo,
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

  const logoUrl = org?.logo ? await presignReadUrl(org.logo) : null
  const canEdit = ["owner", "admin"].includes(session!.user.role ?? "")

  return (
    <div>
      <Header title="Dados da organização" orgName={orgHeader.name} orgLogoUrl={orgHeader.logoUrl} />
      <div className="flex flex-col items-center gap-6 p-6 pt-8">
        {/* Identity card — name + logo (new, above existing cadastro card) */}
        <div className="w-full max-w-lg rounded-xl border bg-card p-8 shadow-sm">
          <h2 className="text-base font-semibold mb-6">Identidade</h2>
          <OrgIdentityForm
            canEdit={canEdit}
            initial={{ name: org?.name ?? "", logoUrl }}
          />
        </div>

        {/* Cadastro card — existing CNPJ / address form */}
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
