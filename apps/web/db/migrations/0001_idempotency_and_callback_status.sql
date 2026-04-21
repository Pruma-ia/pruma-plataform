-- Migration: idempotência em flow_runs + observabilidade de callback em approvals
-- Aplicar via: DATABASE_URL=... npx drizzle-kit migrate
-- Ou direto no banco: docker exec pruma_db psql -U pruma -d pruma_dev -c "..."

-- Idempotência: permite deduplicar reentregas do n8n via executionId
ALTER TABLE "flow_runs" ADD COLUMN "n8n_execution_id" text;
CREATE UNIQUE INDEX "flow_run_n8n_exec_idx" ON "flow_runs" ("n8n_execution_id")
  WHERE "n8n_execution_id" IS NOT NULL;

-- Observabilidade: rastreia se o callback de volta ao n8n foi entregue
ALTER TABLE "approvals" ADD COLUMN "callback_status" text;
