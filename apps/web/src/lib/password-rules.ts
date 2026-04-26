export const PASSWORD_RULES = [
  { id: "len", label: "Mínimo 8 caracteres", test: (p: string) => p.length >= 8 },
  { id: "upper", label: "Uma letra maiúscula", test: (p: string) => /[A-Z]/.test(p) },
  { id: "lower", label: "Uma letra minúscula", test: (p: string) => /[a-z]/.test(p) },
  { id: "number", label: "Um número", test: (p: string) => /\d/.test(p) },
  { id: "special", label: "Um caractere especial (!@#$%^&*)", test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
]

export const PASSWORD_STRENGTH_LABELS = ["", "Muito fraca", "Fraca", "Razoável", "Boa", "Forte"]
export const PASSWORD_STRENGTH_COLORS = ["", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-blue-500", "bg-green-500"]
export const PASSWORD_STRENGTH_TEXT = ["", "text-red-500", "text-orange-500", "text-yellow-500", "text-blue-500", "text-green-500"]
