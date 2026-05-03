/**
 * Unit tests — ProfileDisplayNameForm
 * jsdom environment (*.test.tsx)
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { ProfileDisplayNameForm } from "./profile-display-name-form"

// Mock next/navigation
const mockRefresh = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

// Mock global.fetch
const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

beforeEach(() => {
  vi.clearAllMocks()
})

describe("ProfileDisplayNameForm", () => {
  it("renders with initial name value", () => {
    render(<ProfileDisplayNameForm initialName="Marcelo" email="marcelo@test.com" />)
    const input = screen.getByRole("textbox", { name: /nome de exibição/i })
    expect((input as HTMLInputElement).value).toBe("Marcelo")
  })

  it("shows email as read-only text (not an input)", () => {
    render(<ProfileDisplayNameForm initialName="Marcelo" email="marcelo@test.com" />)
    expect(screen.getByText("marcelo@test.com")).toBeInTheDocument()
    // Email must NOT be an input
    const inputs = screen.queryAllByRole("textbox")
    const emailInput = inputs.find((i) => (i as HTMLInputElement).value === "marcelo@test.com")
    expect(emailInput).toBeUndefined()
  })

  it("submit button is disabled when name is unchanged", () => {
    render(<ProfileDisplayNameForm initialName="Marcelo" email="marcelo@test.com" />)
    const button = screen.getByRole("button", { name: /salvar nome/i })
    expect(button).toBeDisabled()
  })

  it("submit button is enabled when name changes", () => {
    render(<ProfileDisplayNameForm initialName="Marcelo" email="marcelo@test.com" />)
    const input = screen.getByRole("textbox", { name: /nome de exibição/i })
    fireEvent.change(input, { target: { value: "Marcelo Updated" } })
    const button = screen.getByRole("button", { name: /salvar nome/i })
    expect(button).not.toBeDisabled()
  })

  it("calls fetch with PATCH to /api/user/profile on submit", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    })

    render(<ProfileDisplayNameForm initialName="Marcelo" email="marcelo@test.com" />)
    const input = screen.getByRole("textbox", { name: /nome de exibição/i })
    fireEvent.change(input, { target: { value: "Novo Nome" } })
    fireEvent.click(screen.getByRole("button", { name: /salvar nome/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/user/profile",
        expect.objectContaining({ method: "PATCH" })
      )
    })
  })

  it("shows error message from 400 response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: { fieldErrors: { name: ["Nome não pode estar em branco."] } },
      }),
    })

    render(<ProfileDisplayNameForm initialName="Marcelo" email="marcelo@test.com" />)
    const input = screen.getByRole("textbox", { name: /nome de exibição/i })
    fireEvent.change(input, { target: { value: "X" } })
    fireEvent.click(screen.getByRole("button", { name: /salvar nome/i }))

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Nome não pode estar em branco.")
    })
  })

  it("shows success message and calls router.refresh on 200 response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    })

    render(<ProfileDisplayNameForm initialName="Marcelo" email="marcelo@test.com" />)
    const input = screen.getByRole("textbox", { name: /nome de exibição/i })
    fireEvent.change(input, { target: { value: "Novo Nome" } })
    fireEvent.click(screen.getByRole("button", { name: /salvar nome/i }))

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Nome atualizado com sucesso!")
    })
    expect(mockRefresh).toHaveBeenCalledOnce()
  })
})
