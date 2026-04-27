import Link from "next/link"
import Image from "next/image"

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <Image src="/logo-white.png" alt="Pruma IA" width={120} height={32} className="h-8 w-auto dark:block hidden" />
          <Image src="/logo.png" alt="Pruma IA" width={120} height={32} className="h-8 w-auto dark:hidden block" />
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacidade</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Termos</Link>
            <Link href="/dpa" className="hover:text-foreground transition-colors">DPA</Link>
            <Link href="/cookies" className="hover:text-foreground transition-colors">Cookies</Link>
            <Link href="/dashboard" className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-foreground hover:bg-muted transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
              Voltar ao menu
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-12">{children}</main>
      <footer className="border-t border-border mt-16">
        <div className="mx-auto max-w-4xl px-6 py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Pruma IA. Dúvidas: <a href="mailto:privacidade@pruma.io" className="underline">privacidade@pruma.io</a>
        </div>
      </footer>
    </div>
  )
}
