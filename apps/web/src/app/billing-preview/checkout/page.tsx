import { notFound } from "next/navigation"
import { CheckoutForm } from "@/app/(dashboard)/billing/checkout/checkout-form"

export default async function CheckoutPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ incomplete?: string; setup?: string }>
}) {
  if (process.env.NODE_ENV !== "development") {
    notFound()
  }
  const { incomplete, setup } = await searchParams
  const setupCharge = setup === "1" ? { amount: 5000, installments: 3 } : null
  return (
    <div className="min-h-screen bg-muted p-8">
      <div className="max-w-lg mx-auto">
        <CheckoutForm setupCharge={setupCharge} profileIncomplete={incomplete === "1"} />
      </div>
    </div>
  )
}
