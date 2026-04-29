"use client"

import { BillingCheckoutModal } from "@/app/(dashboard)/billing/billing-checkout-modal"

interface Props {
  profileIncomplete: boolean
}

export function BillingPreviewClient({ profileIncomplete }: Props) {
  return (
    <div className="min-h-screen bg-gray-100">
      <BillingCheckoutModal
        planLabel="Pro"
        planPrice="R$ 990"
        isOpen={true}
        onClose={() => {}}
        profileIncomplete={profileIncomplete}
      />
    </div>
  )
}
