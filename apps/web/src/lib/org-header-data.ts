import { db } from "@/lib/db"
import { organizations } from "../../db/schema"
import { eq } from "drizzle-orm"
import { presignReadUrl } from "@/lib/r2"

export interface OrgHeaderData {
  name: string
  logoUrl: string | null
}

/**
 * Fetches org name and a short-lived signed logo URL for the dashboard header.
 * Call from Server Components (page/layout) — never import in client components.
 *
 * R2 note: logoUrl is a presigned URL (short TTL). Do NOT cache it or pass it
 * through Next/Image optimization — use OrgLogo with unoptimized prop.
 */
export async function getOrgHeaderData(orgId: string): Promise<OrgHeaderData> {
  const [org] = await db
    .select({ name: organizations.name, logo: organizations.logo })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)

  if (!org) {
    return { name: "", logoUrl: null }
  }

  const logoUrl = org.logo ? await presignReadUrl(org.logo) : null

  return { name: org.name, logoUrl }
}
