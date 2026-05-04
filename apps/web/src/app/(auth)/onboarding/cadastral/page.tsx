"use client"

import Image from "next/image"
import { useSession } from "next-auth/react"
import { OrgProfileForm } from "@/components/org-profile-form"

export default function CadastralOnboardingPage() {
  // update() from useSession forces the jwt callback to re-query DB → orgCnpjFilled=true
  // in the refreshed token, so the proxy guard does not re-fire after the hard redirect.
  const { update } = useSession()

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 shadow-2xl w-full max-w-lg">
      <div className="mb-7 flex flex-col items-center gap-3">
        <Image
          src="/logo-white.png"
          alt="Pruma IA"
          width={140}
          height={38}
          priority
          className="h-9 w-auto"
        />

        {/* Step indicator dots — step 1 done, step 2 (cadastral) active */}
        <div className="flex items-center justify-center gap-2 mb-6" aria-label="Progresso do onboarding">
          <div className="w-2 h-2 rounded-full bg-white/40" aria-label="Step concluído" />
          <div className="w-2 h-2 rounded-full bg-[#00AEEF]" aria-current="step" aria-label="Step atual" />
        </div>

        <p className="text-sm text-white/60">Dados cadastrais da organização</p>
        <p className="text-xs text-white/40 text-center">
          Necessários para emissão de cobranças Asaas e conformidade LGPD.
        </p>
      </div>

      <OrgProfileForm
        theme="dark"
        onSuccess={async () => {
          await update()
          window.location.href = "/dashboard"
        }}
      />
    </div>
  )
}
