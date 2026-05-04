/**
 * Unit tests for dashboard-metrics helpers.
 * DB is fully mocked — no infra required.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks (vi.mock hoisted — no top-level variables in factory) ───────────────

vi.mock("@/lib/db", () => {
  const mockSelectFn = vi.fn()
  return {
    db: { select: mockSelectFn },
    __mockSelectFn: mockSelectFn,
  }
})

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args: unknown[]) => args),
  eq: vi.fn(),
  gte: vi.fn(),
  inArray: vi.fn(),
  count: vi.fn(() => ({})),
  sql: vi.fn(),
}))

vi.mock("../../db/schema", () => ({
  approvals: {},
  flows: {},
  organizations: {},
}))

// ── Real imports after mocks ──────────────────────────────────────────────────

import { db } from "@/lib/db"
import {
  formatAvgTime,
  getResolvedTodayCount,
  getAvgResolutionMs,
  getOnboardingChecklistState,
} from "./dashboard-metrics"

// ── Helper: build chainable select mock for a single query returning rows ─────

function buildSelectChain(rows: unknown[]) {
  const thenFn = vi.fn().mockImplementation((cb: (r: unknown[]) => unknown) =>
    Promise.resolve(cb(rows))
  )
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnValue({ then: thenFn }),
    then: thenFn,
  }
  return chain
}

// ─────────────────────────────────────────────────────────────────────────────
// formatAvgTime
// ─────────────────────────────────────────────────────────────────────────────

describe("formatAvgTime", () => {
  it("returns '—' for null", () => {
    expect(formatAvgTime(null)).toBe("—")
  })

  it("returns '0min' for 0ms", () => {
    expect(formatAvgTime(0)).toBe("0min")
  })

  it("returns '1min' for 30_000ms (Math.round = 1)", () => {
    expect(formatAvgTime(30_000)).toBe("1min")
  })

  it("returns '30min' for 1_800_000ms (30 min)", () => {
    expect(formatAvgTime(1_800_000)).toBe("30min")
  })

  it("returns '59min' for 3_540_000ms (59 min)", () => {
    expect(formatAvgTime(3_540_000)).toBe("59min")
  })

  it("returns '1h' for 3_600_000ms (exactly 60 min → 1h)", () => {
    // 3_600_000 / 60_000 = 60 min; 60 >= 60 → hours = Math.round(60/60) = 1 → "1h"
    expect(formatAvgTime(3_600_000)).toBe("1h")
  })

  it("returns '2h' for 7_200_000ms (120 min)", () => {
    expect(formatAvgTime(7_200_000)).toBe("2h")
  })

  it("returns '23h' for 82_800_000ms (1380 min = 23h)", () => {
    expect(formatAvgTime(82_800_000)).toBe("23h")
  })

  it("returns '1d' for 86_400_000ms (24h exactly)", () => {
    // 86_400_000 / 60_000 = 1440 min → 1440 / 60 = 24h → >= 24 → days = 1 → "1d"
    expect(formatAvgTime(86_400_000)).toBe("1d")
  })

  it("returns '3d' for 259_200_000ms (72h = 3d)", () => {
    expect(formatAvgTime(259_200_000)).toBe("3d")
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getResolvedTodayCount
// ─────────────────────────────────────────────────────────────────────────────

describe("getResolvedTodayCount", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns the count from DB", async () => {
    vi.mocked(db.select).mockReturnValue(buildSelectChain([{ total: 7 }]) as ReturnType<typeof db.select>)
    const result = await getResolvedTodayCount("org-1")
    expect(result).toBe(7)
  })

  it("returns 0 when DB returns empty array", async () => {
    vi.mocked(db.select).mockReturnValue(buildSelectChain([]) as ReturnType<typeof db.select>)
    const result = await getResolvedTodayCount("org-1")
    expect(result).toBe(0)
  })

  it("returns 0 when row.total is undefined", async () => {
    vi.mocked(db.select).mockReturnValue(buildSelectChain([{}]) as ReturnType<typeof db.select>)
    const result = await getResolvedTodayCount("org-1")
    expect(result).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getAvgResolutionMs
// ─────────────────────────────────────────────────────────────────────────────

describe("getAvgResolutionMs", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns null when row.avgMs is null", async () => {
    vi.mocked(db.select).mockReturnValue(buildSelectChain([{ avgMs: null }]) as ReturnType<typeof db.select>)
    const result = await getAvgResolutionMs("org-1")
    expect(result).toBeNull()
  })

  it("returns null when row.avgMs is undefined", async () => {
    vi.mocked(db.select).mockReturnValue(buildSelectChain([{}]) as ReturnType<typeof db.select>)
    const result = await getAvgResolutionMs("org-1")
    expect(result).toBeNull()
  })

  it("returns numeric value when DB returns avgMs", async () => {
    vi.mocked(db.select).mockReturnValue(buildSelectChain([{ avgMs: 120_000 }]) as ReturnType<typeof db.select>)
    const result = await getAvgResolutionMs("org-1")
    expect(result).toBe(120_000)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getOnboardingChecklistState — D-10 visibility truth table
// ─────────────────────────────────────────────────────────────────────────────

describe("getOnboardingChecklistState — D-10 shouldShow truth table", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function setupMocks(opts: {
    whatsappClickedAt: Date | null
    flowCount: number
    approvalCount: number
  }) {
    // Promise.all fires 3 selects concurrently; each call returns next mock in sequence
    let callCount = 0
    vi.mocked(db.select).mockImplementation((): ReturnType<typeof db.select> => {
      callCount++
      if (callCount === 1) {
        // org query — uses .limit().then()
        return buildSelectChain([{ clickedAt: opts.whatsappClickedAt }]) as ReturnType<typeof db.select>
      }
      if (callCount === 2) {
        // flow count query — uses .then()
        return buildSelectChain([{ total: opts.flowCount }]) as ReturnType<typeof db.select>
      }
      // approval count query — uses .then()
      return buildSelectChain([{ total: opts.approvalCount }]) as ReturnType<typeof db.select>
    })
  }

  it("fresh org (flows=0, approvals=0, whatsappClicked=false) → shouldShow=true (D-10: fresh org)", async () => {
    setupMocks({ whatsappClickedAt: null, flowCount: 0, approvalCount: 0 })
    const state = await getOnboardingChecklistState("org-1")
    expect(state.shouldShow).toBe(true)
    expect(state.whatsappClicked).toBe(false)
    expect(state.processConfigured).toBe(false)
    expect(state.firstApproval).toBe(false)
    expect(state.allDone).toBe(false)
  })

  it("fresh org (flows=0, approvals=0, whatsappClicked=true) → shouldShow=true (still fresh + incomplete)", async () => {
    setupMocks({ whatsappClickedAt: new Date(), flowCount: 0, approvalCount: 0 })
    const state = await getOnboardingChecklistState("org-1")
    expect(state.shouldShow).toBe(true)
    expect(state.whatsappClicked).toBe(true)
    expect(state.processConfigured).toBe(false)
    expect(state.firstApproval).toBe(false)
    expect(state.allDone).toBe(false)
  })

  it("has flow, no approvals, whatsappClicked=false → shouldShow=true (incomplete; whatsappClicked irrelevant to visibility)", async () => {
    setupMocks({ whatsappClickedAt: null, flowCount: 1, approvalCount: 0 })
    const state = await getOnboardingChecklistState("org-1")
    expect(state.shouldShow).toBe(true)
    expect(state.whatsappClicked).toBe(false)
    expect(state.processConfigured).toBe(true)
    expect(state.firstApproval).toBe(false)
    expect(state.allDone).toBe(false)
  })

  it("has flow, no approvals, whatsappClicked=true → shouldShow=true (still incomplete)", async () => {
    setupMocks({ whatsappClickedAt: new Date(), flowCount: 1, approvalCount: 0 })
    const state = await getOnboardingChecklistState("org-1")
    expect(state.shouldShow).toBe(true)
    expect(state.whatsappClicked).toBe(true)
    expect(state.processConfigured).toBe(true)
    expect(state.firstApproval).toBe(false)
    expect(state.allDone).toBe(false)
  })

  it("has flows+approvals, whatsappClicked=true → shouldShow=false (allDone=true; D-11)", async () => {
    setupMocks({ whatsappClickedAt: new Date(), flowCount: 2, approvalCount: 5 })
    const state = await getOnboardingChecklistState("org-1")
    expect(state.shouldShow).toBe(false)
    expect(state.whatsappClicked).toBe(true)
    expect(state.processConfigured).toBe(true)
    expect(state.firstApproval).toBe(true)
    expect(state.allDone).toBe(true)
  })

  it("has flows+approvals, whatsappClicked=false → shouldShow=true (NOT allDone; visible until item 1 complete)", async () => {
    setupMocks({ whatsappClickedAt: null, flowCount: 2, approvalCount: 5 })
    const state = await getOnboardingChecklistState("org-1")
    expect(state.shouldShow).toBe(true)
    expect(state.whatsappClicked).toBe(false)
    expect(state.processConfigured).toBe(true)
    expect(state.firstApproval).toBe(true)
    expect(state.allDone).toBe(false)
  })
})
