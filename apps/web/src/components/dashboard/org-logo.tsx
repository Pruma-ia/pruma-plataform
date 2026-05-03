import Image from "next/image"

interface OrgLogoProps {
  logoUrl: string | null // signed read URL (short TTL) or null
  name: string          // org name; used for initials fallback + alt text
  size?: number         // px, defaults to 28
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "?"
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase()
  return (words[0]![0]! + words[words.length - 1]![0]!).toUpperCase()
}

export function OrgLogo({ logoUrl, name, size = 28 }: OrgLogoProps) {
  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={`Logo de ${name}`}
        width={size}
        height={size}
        className="rounded-md object-contain"
        // unoptimized: R2 signed URLs change per request. Next/Image's optimizer
        // caches by URL — caching a short-lived signed URL would 403 on reload.
        // See apps/web/CLAUDE.md R2 footguns.
        unoptimized
      />
    )
  }
  return (
    <div
      className="flex items-center justify-center rounded-md bg-[#E0F6FE] text-[#0D1B4B] font-semibold text-xs"
      style={{ width: size, height: size }}
      aria-label={`Logo de ${name} (iniciais)`}
      role="img"
    >
      {getInitials(name)}
    </div>
  )
}
