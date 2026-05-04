CREATE TABLE IF NOT EXISTS "approval_events" (
  "id" text PRIMARY KEY NOT NULL,
  "approval_id" text NOT NULL,
  "event_type" text NOT NULL,
  "actor_type" text NOT NULL,
  "actor_id" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "approval_events"
    ADD CONSTRAINT "approval_events_approval_id_approvals_id_fk"
    FOREIGN KEY ("approval_id") REFERENCES "approvals"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "approval_events_approval_idx"
  ON "approval_events" ("approval_id", "created_at");
