import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { Header } from "./header"

// ── Mock client-only dependencies ─────────────────────────────────────────────

vi.mock("@/components/theme-provider", () => ({
  useTheme: () => ({ resolvedTheme: "light", setTheme: vi.fn() }),
}))

// next/image: just render an <img> in tests
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}))

// ── getInitials parity tests (via OrgLogo fallback) ──────────────────────────
// Rather than testing getInitials directly (unexported), we verify OrgLogo's
// rendered initials via the Header component (logoUrl=null triggers fallback).

describe("Header", () => {
  it("renders the title prop", () => {
    render(<Header title="Dashboard" orgName="Acme" orgLogoUrl={null} />)
    expect(screen.getByText("Dashboard")).toBeInTheDocument()
  })

  it("renders OrgLogo with initials fallback when logoUrl is null", () => {
    render(<Header title="Test" orgName="Acme" orgLogoUrl={null} />)
    // The initials fallback div has role="img" and aria-label
    const logo = screen.getByRole("img", { name: /Logo de Acme \(iniciais\)/i })
    expect(logo).toBeInTheDocument()
  })

  it("renders OrgLogo <img> when logoUrl is provided", () => {
    render(<Header title="Test" orgName="Acme" orgLogoUrl="https://r2.example.com/logo.png" />)
    const img = screen.getByRole("img", { name: /Logo de Acme/i })
    expect(img).toHaveAttribute("src", "https://r2.example.com/logo.png")
  })

  it("getInitials: single word → first 2 chars uppercase ('Acme' → 'AC')", () => {
    render(<Header title="T" orgName="Acme" orgLogoUrl={null} />)
    expect(screen.getByRole("img")).toHaveTextContent("AC")
  })

  it("getInitials: two words → first + last initials ('Acme Corp' → 'AC')", () => {
    render(<Header title="T" orgName="Acme Corp" orgLogoUrl={null} />)
    expect(screen.getByRole("img")).toHaveTextContent("AC")
  })

  it("getInitials: 'Pruma IA' → 'PI'", () => {
    render(<Header title="T" orgName="Pruma IA" orgLogoUrl={null} />)
    expect(screen.getByRole("img")).toHaveTextContent("PI")
  })

  it("getInitials: empty string → '?'", () => {
    render(<Header title="T" orgName="" orgLogoUrl={null} />)
    expect(screen.getByRole("img")).toHaveTextContent("?")
  })

  it("getInitials: 'Acme Corp Holdings' → first + last initial ('AH')", () => {
    render(<Header title="T" orgName="Acme Corp Holdings" orgLogoUrl={null} />)
    expect(screen.getByRole("img")).toHaveTextContent("AH")
  })
})
