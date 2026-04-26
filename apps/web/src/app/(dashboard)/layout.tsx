import { SessionProvider } from "next-auth/react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { TermsAcceptanceModal } from "@/components/auth/terms-acceptance-modal"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { users } from "../../../db/schema"
import { eq } from "drizzle-orm"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  const [dbUser] = await db
    .select({ acceptedTermsAt: users.acceptedTermsAt })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  const needsTermsAcceptance = !dbUser?.acceptedTermsAt

  return (
    <SessionProvider session={session}>
      {needsTermsAcceptance && <TermsAcceptanceModal />}
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          isSuperAdmin={session.user.isSuperAdmin ?? false}
          userName={session.user.name ?? ""}
          userImage={session.user.image ?? null}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-background">{children}</main>
          <footer className="border-t border-border px-6 py-3 flex items-center justify-end gap-4 text-xs text-muted-foreground shrink-0">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacidade</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Termos</Link>
            <Link href="/dpa" className="hover:text-foreground transition-colors">DPA</Link>
            <Link href="/cookies" className="hover:text-foreground transition-colors">Cookies</Link>
          </footer>
        </div>
      </div>
    </SessionProvider>
  )
}
