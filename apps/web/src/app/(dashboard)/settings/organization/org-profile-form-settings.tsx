"use client"

import { useState } from "react"
import { OrgProfileForm } from "@/components/org-profile-form"

interface Props {
  initialData?: {
    cnpj: string | null
    phone: string | null
    addressStreet: string | null
    addressNumber: string | null
    addressComplement: string | null
    addressZipCode: string | null
    addressCity: string | null
    addressState: string | null
  }
}

export function OrgProfileFormSettings({ initialData }: Props) {
  const [saved, setSaved] = useState(false)

  return (
    <div>
      {saved && (
        <div className="mb-4 rounded-md bg-green-50 border border-green-200 px-4 py-2.5 text-sm text-green-700">
          Dados salvos com sucesso.
        </div>
      )}
      <OrgProfileForm
        initialData={{
          cnpj: initialData?.cnpj ?? undefined,
          phone: initialData?.phone ?? undefined,
          addressZipCode: initialData?.addressZipCode ?? undefined,
          addressStreet: initialData?.addressStreet ?? undefined,
          addressNumber: initialData?.addressNumber ?? undefined,
          addressComplement: initialData?.addressComplement ?? undefined,
          addressCity: initialData?.addressCity ?? undefined,
          addressState: initialData?.addressState ?? undefined,
        }}
        onSuccess={() => setSaved(true)}
        theme="light"
      />
    </div>
  )
}
