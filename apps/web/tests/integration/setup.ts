// Global setup/teardown for all integration tests.
// Runs in every worker (only 1 worker with singleFork).
//
// KEEP_DATA=1 + INT_TEST_ORG_ID=<id> — usa org real em vez de criar org temporária.
// Permite ver aprovações criadas pelos testes no frontend com a sessão real do dev.
import { db } from "@/lib/db"
import { organizations, users } from "../../db/schema"
import { eq } from "drizzle-orm"
import { ctx } from "./state"

const RUN_ID = Date.now()

beforeAll(async () => {
  const realOrgId = process.env.INT_TEST_ORG_ID
  const realUserId = process.env.INT_TEST_USER_ID

  if (realOrgId && realUserId) {
    // Copilot mode: usa org/user existentes — aprovações aparecem na sessão real do dev
    const [org] = await db.select().from(organizations).where(eq(organizations.id, realOrgId))
    if (!org) throw new Error(`INT_TEST_ORG_ID "${realOrgId}" não encontrado no banco`)
    ctx.orgId = org.id
    ctx.n8nSlug = org.n8nSlug
    ctx.userId = realUserId
    ctx._ownedOrg = false
    return
  }

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
  ctx._ownedOrg = true
}, 15_000)

afterAll(async () => {
  if (process.env.KEEP_DATA === "1") {
    console.log("\n─────────────────────────────────────────────")
    console.log("KEEP_DATA=1 → dados preservados no DB local")
    console.log(`  Org ID   : ${ctx.orgId}`)
    console.log(`  User ID  : ${ctx.userId}`)
    console.log(`  n8nSlug  : ${ctx.n8nSlug}`)
    if (!ctx._ownedOrg) console.log("  (org real — dados visíveis na sua sessão)")
    console.log("─────────────────────────────────────────────\n")
    return
  }
  // Não deletar org/user externos (INT_TEST_ORG_ID) — apenas aprovações criadas pelos testes
  if (!ctx._ownedOrg) return
  // Org delete cascades: approvals, approvalFiles, approvalFileUploads, flows, members
  if (ctx.orgId) await db.delete(organizations).where(eq(organizations.id, ctx.orgId))
  if (ctx.userId) await db.delete(users).where(eq(users.id, ctx.userId))
}, 15_000)
