import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <p className="text-4xl font-bold text-muted-foreground">404</p>
      <p className="text-muted-foreground">Página não encontrada.</p>
      <Link
        href="/dashboard"
        className="flex items-center gap-1 text-sm text-[#00AEEF] hover:underline"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar para o início
      </Link>
    </div>
  )
}
