// Global setup/teardown for all integration tests.
// Runs in every worker (only 1 worker with singleFork).
import { db } from "@/lib/db"
import { organizations, users } from "../../db/schema"
import { eq } from "drizzle-orm"
import { ctx } from "./state"

const RUN_ID = Date.now()

beforeAll(async () => {
  const slug = `test-int-${RUN_ID}`
  const n8nSlug = `n8n-int-${RUN_ID}`

  const [org] = await db
    .insert(organizations)
    .values({ name: "Integration Test Org", slug, n8nSlug, subscriptionStatus: "active" })
    .returning()

  const [user] = await db
    .insert(users)
    .values({ name: "Integration Tester", email: `tester-${RUN_ID}@int.pruma` })
    .returning()

  ctx.orgId = org.id
  ctx.n8nSlug = n8nSlug
  ctx.userId = user.id
}, 15_000)

afterAll(async () => {
  // Org delete cascades: approvals, approvalFiles, approvalFileUploads, flows, members
  if (ctx.orgId) await db.delete(organizations).where(eq(organizations.id, ctx.orgId))
  if (ctx.userId) await db.delete(users).where(eq(users.id, ctx.userId))
}, 15_000)
