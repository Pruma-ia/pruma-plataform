import { describe, it, expect } from "vitest"
import { cn } from "./utils"

describe("cn", () => {
  it("merges class names", () => expect(cn("foo", "bar")).toBe("foo bar"))
  it("handles conditional false", () => expect(cn("base", false && "skip", "end")).toBe("base end"))
  it("deduplicates tailwind conflicts", () => expect(cn("p-2", "p-4")).toBe("p-4"))
  it("returns empty string for no args", () => expect(cn()).toBe(""))
  it("handles undefined/null gracefully", () => expect(cn(undefined, null as never, "x")).toBe("x"))
})
