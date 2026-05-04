/**
 * Unit tests for OnboardingChecklist component.
 * Uses @testing-library/react. fetch and window.open are mocked globally.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Stub lucide-react icons used by the component
vi.mock("lucide-react", () => ({
  CheckCircle2: () => <span data-testid="icon-check" />,
  Circle: () => <span data-testid="icon-circle" />,
  ExternalLink: () => <span data-testid="icon-external" />,
  ListChecks: () => <span data-testid="icon-list-checks" />,
}))

// Stub shadcn Button
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}))

// ── Import component after mocks ──────────────────────────────────────────────

import { OnboardingChecklist } from "./onboarding-checklist"

// ── Helpers ───────────────────────────────────────────────────────────────────

const defaultProps = {
  whatsappClicked: false,
  processConfigured: false,
  firstApproval: false,
  whatsappLink: "https://wa.me/5511999999999",
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("OnboardingChecklist", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset fetch and window.open mocks
    global.fetch = vi.fn().mockResolvedValue({ ok: true })
    vi.spyOn(window, "open").mockImplementation(() => null)
  })

  it("renders section title 'Primeiros passos'", () => {
    render(<OnboardingChecklist {...defaultProps} />)
    expect(screen.getByText("Primeiros passos")).toBeInTheDocument()
  })

  it("renders all 3 item labels", () => {
    render(<OnboardingChecklist {...defaultProps} />)
    expect(screen.getByText("Agendar suporte com a Pruma")).toBeInTheDocument()
    expect(screen.getByText("Processo configurado pela Pruma")).toBeInTheDocument()
    expect(screen.getByText("Primeira aprovação recebida")).toBeInTheDocument()
  })

  it("renders sub-labels for items 2 and 3", () => {
    render(<OnboardingChecklist {...defaultProps} />)
    expect(screen.getByText("Nossa equipe irá configurar seus fluxos de aprovação.")).toBeInTheDocument()
    expect(screen.getByText("Aguardando a primeira aprovação do seu processo.")).toBeInTheDocument()
  })

  it("shows '0 de 3 concluídos' when nothing is done", () => {
    render(<OnboardingChecklist {...defaultProps} />)
    expect(screen.getByText("0 de 3 concluídos")).toBeInTheDocument()
  })

  it("shows '1 de 3 concluídos' when whatsappClicked=true only", () => {
    render(<OnboardingChecklist {...defaultProps} whatsappClicked={true} />)
    expect(screen.getByText("1 de 3 concluídos")).toBeInTheDocument()
  })

  it("shows '2 de 3 concluídos' when whatsappClicked+processConfigured=true", () => {
    render(<OnboardingChecklist {...defaultProps} whatsappClicked={true} processConfigured={true} />)
    expect(screen.getByText("2 de 3 concluídos")).toBeInTheDocument()
  })

  it("shows '3 de 3 concluídos' when all done", () => {
    render(<OnboardingChecklist {...defaultProps} whatsappClicked={true} processConfigured={true} firstApproval={true} />)
    expect(screen.getByText("3 de 3 concluídos")).toBeInTheDocument()
  })

  it("shows 'Falar com suporte' button when whatsappClicked=false", () => {
    render(<OnboardingChecklist {...defaultProps} whatsappClicked={false} />)
    expect(screen.getByText("Falar com suporte")).toBeInTheDocument()
  })

  it("hides 'Falar com suporte' button when whatsappClicked=true", () => {
    render(<OnboardingChecklist {...defaultProps} whatsappClicked={true} />)
    expect(screen.queryByText("Falar com suporte")).not.toBeInTheDocument()
  })

  it("clicking 'Falar com suporte' opens whatsappLink in new tab", () => {
    render(<OnboardingChecklist {...defaultProps} whatsappLink="https://wa.me/test" />)
    const btn = screen.getByText("Falar com suporte")
    fireEvent.click(btn)
    expect(window.open).toHaveBeenCalledWith("https://wa.me/test", "_blank", "noopener,noreferrer")
  })

  it("clicking 'Falar com suporte' fires POST /api/onboarding/whatsapp-clicked", () => {
    render(<OnboardingChecklist {...defaultProps} />)
    const btn = screen.getByText("Falar com suporte")
    fireEvent.click(btn)
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/onboarding/whatsapp-clicked",
      { method: "POST" },
    )
  })

  it("button has exact aria-label 'Agendar suporte com a Pruma — abre WhatsApp'", () => {
    render(<OnboardingChecklist {...defaultProps} />)
    expect(
      screen.getByRole("button", { name: /Agendar suporte com a Pruma — abre WhatsApp/ }),
    ).toBeInTheDocument()
  })

  it("item 2 label has line-through class when processConfigured=true", () => {
    render(<OnboardingChecklist {...defaultProps} processConfigured={true} />)
    const label = screen.getByText("Processo configurado pela Pruma")
    expect(label.className).toContain("line-through")
  })

  it("item 3 label has line-through class when firstApproval=true", () => {
    render(<OnboardingChecklist {...defaultProps} firstApproval={true} />)
    const label = screen.getByText("Primeira aprovação recebida")
    expect(label.className).toContain("line-through")
  })

  it("renders role='list' and 3 role='listitem' entries", () => {
    render(<OnboardingChecklist {...defaultProps} />)
    expect(screen.getByRole("list")).toBeInTheDocument()
    expect(screen.getAllByRole("listitem")).toHaveLength(3)
  })

  it("renders 'de 3 concluídos' text (partial match for robustness)", () => {
    render(<OnboardingChecklist {...defaultProps} />)
    expect(screen.getByText(/de 3 concluídos/)).toBeInTheDocument()
  })
})
