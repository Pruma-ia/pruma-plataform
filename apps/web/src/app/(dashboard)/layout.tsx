import { SessionProvider } from "next-auth/react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <SessionProvider session={session}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          isSuperAdmin={session.user.isSuperAdmin ?? false}
          userName={session.user.name ?? ""}
          userImage={session.user.image ?? null}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-background">{children}</main>
        </div>
      </div>
    </SessionProvider>
  )
}
