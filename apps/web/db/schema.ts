import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
  uniqueIndex,
  index,
  jsonb,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

// ─── Enums ────────────────────────────────────────────────────────────────────

export const memberRoleEnum = pgEnum("member_role", ["owner", "admin", "member", "viewer"])
export const flowStatusEnum = pgEnum("flow_status", ["running", "success", "error", "waiting"])
export const approvalStatusEnum = pgEnum("approval_status", ["pending", "approved", "rejected"])
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "trial",
  "past_due",
  "canceled",
  "inactive",
])

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified"),
  image: text("image"),
  password: text("password"),
  isSuperAdmin: boolean("is_super_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const accounts = pgTable("accounts", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
})

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
})

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires").notNull(),
  },
  (t) => [uniqueIndex("vt_identifier_token").on(t.identifier, t.token)]
)

// ─── Organizations (Tenants) ──────────────────────────────────────────────────

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  // Slug imutável usado nas integrações n8n — separado do slug de URL para permitir rebranding
  n8nSlug: text("n8n_slug").unique(),
  // URL base do n8n self-hosted — usada para validar callbackUrl nas approvals
  n8nBaseUrl: text("n8n_base_url"),
  logo: text("logo"),
  // Asaas
  asaasCustomerId: text("asaas_customer_id").unique(),
  asaasSubscriptionId: text("asaas_subscription_id"),
  asaasPlanId: text("asaas_plan_id"),
  subscriptionStatus: subscriptionStatusEnum("subscription_status").default("trial").notNull(),
  subscriptionEndsAt: timestamp("subscription_ends_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").default("member").notNull(),
    invitedBy: text("invited_by").references(() => users.id),
    acceptedAt: timestamp("accepted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("org_member_unique").on(t.organizationId, t.userId)]
)

export const organizationInvites = pgTable("organization_invites", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: memberRoleEnum("role").default("member").notNull(),
  token: text("token").notNull().unique(),
  invitedBy: text("invited_by").notNull().references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// ─── Flows (from n8n) ─────────────────────────────────────────────────────────

export const flows = pgTable(
  "flows",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    // ID estável definido pelo dev no pruma.json — nunca muda, único por org
    prumaFlowId: text("pruma_flow_id").notNull(),
    // ID do workflow no n8n — pode mudar se o workflow for deletado e recriado
    n8nWorkflowId: text("n8n_workflow_id"),
    name: text("name").notNull(),
    description: text("description"),
    status: flowStatusEnum("status").default("running").notNull(),
    // Dados do payload do n8n
    metadata: jsonb("metadata"),
    lastRunAt: timestamp("last_run_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("flow_org_pruma_id").on(t.organizationId, t.prumaFlowId),
    index("flow_n8n_workflow_idx").on(t.n8nWorkflowId),
    index("flow_org_idx").on(t.organizationId),
  ]
)

export const flowRuns = pgTable(
  "flow_runs",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    flowId: text("flow_id")
      .notNull()
      .references(() => flows.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    status: flowStatusEnum("status").notNull(),
    // Payload completo do n8n
    payload: jsonb("payload"),
    errorMessage: text("error_message"),
    // ID da execução no n8n — usado para idempotência (evita duplicatas em reentregas)
    n8nExecutionId: text("n8n_execution_id").unique(),
    startedAt: timestamp("started_at"),
    finishedAt: timestamp("finished_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("flow_run_flow_idx").on(t.flowId)]
)

// ─── Approvals ────────────────────────────────────────────────────────────────

export const approvals = pgTable(
  "approvals",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    flowId: text("flow_id").references(() => flows.id, { onDelete: "set null" }),
    // ID da execução no n8n para callback
    n8nExecutionId: text("n8n_execution_id"),
    // URL de callback para notificar o n8n após aprovação/rejeição
    callbackUrl: text("callback_url"),
    title: text("title").notNull(),
    description: text("description"),
    // Dados do contexto enviados pelo n8n
    context: jsonb("context"),
    status: approvalStatusEnum("status").default("pending").notNull(),
    assignedTo: text("assigned_to").references(() => users.id),
    resolvedBy: text("resolved_by").references(() => users.id),
    resolvedAt: timestamp("resolved_at"),
    comment: text("comment"),
    expiresAt: timestamp("expires_at"),
    // Status do callback para o n8n: "sent" | "failed" | "blocked" (SSRF) | "exhausted" | null
    callbackStatus: text("callback_status"),
    // Quantas vezes o retry automático tentou reenviar após falha inicial
    callbackRetries: integer("callback_retries").default(0).notNull(),
    // Campos de decisão definidos pelo n8n ao criar: [{id, type:"select", label, options:[{id,label}]}]
    decisionFields: jsonb("decision_fields"),
    // Valores preenchidos pelo aprovador: {fieldId: optionId}
    decisionValues: jsonb("decision_values"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("approval_org_idx").on(t.organizationId)]
)

// ─── Approval Files ───────────────────────────────────────────────────────────

export const approvalFiles = pgTable(
  "approval_files",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    approvalId: text("approval_id")
      .notNull()
      .references(() => approvals.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    // Path no bucket R2: {orgId}/{uuid}/{filename}
    r2Key: text("r2_key").notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("approval_files_approval_idx").on(t.approvalId)]
)

// ─── Approval File Uploads (presign tracking) ─────────────────────────────────

export const approvalFileUploads = pgTable(
  "approval_file_uploads",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    r2Key: text("r2_key").notNull().unique(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    // "pending" → presign gerado, aguardando upload + confirmação; "confirmed" → vinculado a uma aprovação
    status: text("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("approval_file_uploads_org_idx").on(t.organizationId)]
)

// ─── Onboarding Tokens ───────────────────────────────────────────────────────

export const onboardingTokens = pgTable("onboarding_tokens", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  // SHA-256 do token raw — nunca armazenar o token em claro
  tokenHash: text("token_hash").notNull().unique(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  memberships: many(organizationMembers),
}))

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  flows: many(flows),
  approvals: many(approvals),
  onboardingTokens: many(onboardingTokens),
}))

export const onboardingTokensRelations = relations(onboardingTokens, ({ one }) => ({
  organization: one(organizations, {
    fields: [onboardingTokens.organizationId],
    references: [organizations.id],
  }),
}))

export const flowsRelations = relations(flows, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [flows.organizationId],
    references: [organizations.id],
  }),
  runs: many(flowRuns),
  approvals: many(approvals),
}))

export const approvalsRelations = relations(approvals, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [approvals.organizationId],
    references: [organizations.id],
  }),
  flow: one(flows, {
    fields: [approvals.flowId],
    references: [flows.id],
  }),
  assignedUser: one(users, {
    fields: [approvals.assignedTo],
    references: [users.id],
  }),
  files: many(approvalFiles),
}))

export const approvalFilesRelations = relations(approvalFiles, ({ one }) => ({
  approval: one(approvals, {
    fields: [approvalFiles.approvalId],
    references: [approvals.id],
  }),
  organization: one(organizations, {
    fields: [approvalFiles.organizationId],
    references: [organizations.id],
  }),
}))
