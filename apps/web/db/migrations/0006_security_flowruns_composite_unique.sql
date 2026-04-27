-- Security fix: scope n8nExecutionId uniqueness per org to prevent cross-tenant idempotency collisions
DROP INDEX IF EXISTS "flow_run_n8n_exec_idx";
--> statement-breakpoint
CREATE UNIQUE INDEX "flow_run_org_execution_unique" ON "flow_runs" ("organization_id","n8n_execution_id")
  WHERE "n8n_execution_id" IS NOT NULL;