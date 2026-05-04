"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"

// Client-side validation constants — mirrors server values (MAX_LOGO_SIZE_BYTES, LOGO_ALLOWED_MIME_TYPES in r2.ts).
// Duplicated intentionally: server libs must not be imported into client components.
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"])
const MAX_BYTES = 2 * 1024 * 1024 // 2MB

interface OrgIdentityFormProps {
  canEdit: boolean
  initial: {
    name: string
    logoUrl: string | null
  }
}

export function OrgIdentityForm({ canEdit, initial }: OrgIdentityFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(initial.name)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(initial.logoUrl)
  const [removeLogoFlag, setRemoveLogoFlag] = useState(false)

  const [error, setError] = useState("")
  const [fileError, setFileError] = useState("")
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError("")
    const file = e.target.files?.[0]
    if (!file) return

    if (!ALLOWED_TYPES.has(file.type)) {
      setFileError("Tipo de arquivo não permitido. Use PNG, JPG ou WebP.")
      e.target.value = ""
      return
    }
    if (file.size > MAX_BYTES) {
      setFileError("Arquivo muito grande. O tamanho máximo é 2MB.")
      e.target.value = ""
      return
    }

    setSelectedFile(file)
    setRemoveLogoFlag(false)
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
  }

  function handleRemoveLogo() {
    setSelectedFile(null)
    setPreviewUrl(null)
    setRemoveLogoFlag(true)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setFileError("")
    setLoading(true)
    setSaved(false)

    try {
      let logoR2Key: string | null | undefined = undefined

      // Step 1: Upload logo if a new file was selected
      if (selectedFile) {
        const presignRes = await fetch("/api/organizations/logo/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: selectedFile.name,
            mimeType: selectedFile.type,
            sizeBytes: selectedFile.size,
          }),
        })

        if (!presignRes.ok) {
          const data = await presignRes.json().catch(() => ({}))
          setError(data.error ?? "Erro ao solicitar upload do logo.")
          return
        }

        const { uploadUrl, r2Key } = await presignRes.json() as { uploadUrl: string; r2Key: string; expiresAt: string }

        // PUT directly to R2 — file never traverses the Next.js server
        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": selectedFile.type },
          body: selectedFile,
        })

        if (!uploadRes.ok) {
          setError("Erro ao enviar o arquivo. Tente novamente.")
          return
        }

        logoR2Key = r2Key
      } else if (removeLogoFlag) {
        logoR2Key = null
      }

      // Step 2: PATCH profile — only send changed fields
      const patchBody: Record<string, unknown> = {}
      if (name !== initial.name) patchBody.name = name
      if (logoR2Key !== undefined) patchBody.logo = logoR2Key

      // Nothing changed — skip the PATCH
      if (Object.keys(patchBody).length === 0) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
        return
      }

      const patchRes = await fetch("/api/organizations/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchBody),
      })

      if (!patchRes.ok) {
        const data = await patchRes.json().catch(() => ({}))
        setError(data.error ?? "Erro ao salvar. Tente novamente.")
        return
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  if (!canEdit) {
    return (
      <div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" htmlFor="org-name-readonly">
              Nome da organização
            </label>
            <input
              id="org-name-readonly"
              type="text"
              value={name}
              disabled
              className="w-full rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
            />
          </div>
          {previewUrl && (
            <div>
              <p className="block text-sm font-medium mb-1.5">Logo atual</p>
              <Image
                src={previewUrl}
                alt="Logo da organização"
                width={56}
                height={56}
                className="rounded-md object-contain border"
                unoptimized
              />
            </div>
          )}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Apenas owner ou admin podem editar identidade da organização.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name field */}
      <div>
        <label htmlFor="org-name" className="block text-sm font-medium mb-1.5">
          Nome da organização
        </label>
        <input
          id="org-name"
          name="org-name"
          type="text"
          autoComplete="organization"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          required
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Logo field */}
      <div>
        <p className="block text-sm font-medium mb-2">Logo</p>

        {/* Preview */}
        {previewUrl ? (
          <div className="mb-3 flex items-center gap-3">
            <Image
              src={previewUrl}
              alt="Pré-visualização do logo"
              width={56}
              height={56}
              className="rounded-md object-contain border"
              unoptimized
            />
            <button
              type="button"
              onClick={handleRemoveLogo}
              className="text-sm text-destructive hover:underline"
            >
              Remover logo
            </button>
          </div>
        ) : (
          <div
            className="mb-3 flex h-14 w-14 items-center justify-center rounded-md bg-[#E0F6FE] text-[#0D1B4B] font-semibold text-xs"
            aria-label="Sem logo — iniciais da organização"
          >
            {name.trim()
              ? (() => {
                  const words = name.trim().split(/\s+/).filter(Boolean)
                  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase()
                  return (words[0]![0]! + words[words.length - 1]![0]!).toUpperCase()
                })()
              : "?"}
          </div>
        )}

        {/* File picker */}
        <div>
          <label htmlFor="org-logo" className="sr-only">
            Selecionar arquivo de logo
          </label>
          <input
            ref={fileInputRef}
            id="org-logo"
            name="org-logo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="block text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:cursor-pointer hover:file:bg-secondary/80"
            aria-describedby="org-logo-hint"
          />
          <p id="org-logo-hint" className="mt-1 text-xs text-muted-foreground">
            PNG, JPG ou WebP. Máximo 2MB.
          </p>
        </div>

        {/* File error */}
        {fileError && (
          <p role="alert" className="mt-1.5 text-sm text-destructive">
            {fileError}
          </p>
        )}
      </div>

      {/* Submit error */}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Success */}
      {saved && (
        <p className="text-sm text-emerald-600">Salvo com sucesso.</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {loading ? "Salvando..." : "Salvar identidade"}
      </button>
    </form>
  )
}
