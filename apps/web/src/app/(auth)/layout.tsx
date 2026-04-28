export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-8"
      style={{
        background: "linear-gradient(135deg, oklch(0.198 0.116 264.1) 0%, oklch(0.280 0.126 264.4) 100%)",
      }}
    >
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
