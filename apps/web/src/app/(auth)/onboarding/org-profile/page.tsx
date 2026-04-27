"use client"

import { useState } from "react"
import Image from "next/image"
import { OrgProfileForm } from "@/components/org-profile-form"

export default function OrgProfileOnboardingPage() {
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
        <p className="text-sm text-white/60">Dados cadastrais da sua organização</p>
        <p className="text-xs text-white/40 text-center">
          Usados para pré-preencher o checkout. Você pode pular e preencher depois.
        </p>
      </div>

      <OrgProfileForm
        onSuccess={() => { window.location.href = "/dashboard" }}
        onSkip={() => { window.location.href = "/dashboard" }}
        theme="dark"
      />
    </div>
  )
}
