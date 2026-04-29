import { notFound } from "next/navigation"
import { BillingPreviewClient } from "./billing-preview-client"

export default async function BillingPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ incomplete?: string }>
}) {
  if (process.env.NODE_ENV !== "development") {
    notFound()
  }
  const { incomplete } = await searchParams
  return <BillingPreviewClient profileIncomplete={incomplete === "1"} />
}
