/**
 * Unit tests — ConnectedAccountsList
 * jsdom environment (*.test.tsx)
 */

import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ConnectedAccountsList } from "./connected-accounts-list"

describe("ConnectedAccountsList", () => {
  it("renders empty state when accounts is empty", () => {
    render(<ConnectedAccountsList accounts={[]} />)
    expect(screen.getByText("Nenhuma conta conectada.")).toBeInTheDocument()
  })

  it("renders one row per account", () => {
    render(
      <ConnectedAccountsList
        accounts={[
          { provider: "google", providerAccountId: "g-123" },
          { provider: "credentials", providerAccountId: "user-1" },
        ]}
      />
    )
    const items = screen.getAllByRole("listitem")
    expect(items).toHaveLength(2)
  })

  it("maps 'google' provider to 'Google' label", () => {
    render(
      <ConnectedAccountsList
        accounts={[{ provider: "google", providerAccountId: "g-abc" }]}
      />
    )
    expect(screen.getByText("Google")).toBeInTheDocument()
  })

  it("maps 'credentials' provider to 'E-mail e senha' label", () => {
    render(
      <ConnectedAccountsList
        accounts={[{ provider: "credentials", providerAccountId: "user-1" }]}
      />
    )
    expect(screen.getByText("E-mail e senha")).toBeInTheDocument()
  })

  it("uses provider name as label fallback for unknown providers", () => {
    render(
      <ConnectedAccountsList
        accounts={[{ provider: "github", providerAccountId: "gh-999" }]}
      />
    )
    expect(screen.getByText("github")).toBeInTheDocument()
  })

  it("does NOT render any disconnect button (PROF-02 view-only contract)", () => {
    render(
      <ConnectedAccountsList
        accounts={[
          { provider: "google", providerAccountId: "g-123" },
          { provider: "credentials", providerAccountId: "user-1" },
        ]}
      />
    )
    expect(screen.queryByRole("button", { name: /desconectar/i })).toBeNull()
    expect(screen.queryByRole("button")).toBeNull()
  })
})
