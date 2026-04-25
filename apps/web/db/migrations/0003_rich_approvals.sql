ALTER TABLE "approvals" ADD COLUMN "decision_fields" jsonb;
--> statement-breakpoint
ALTER TABLE "approvals" ADD COLUMN "decision_values" jsonb;
--> statement-breakpoint
CREATE TABLE "approval_files" (
  "id" text PRIMARY KEY NOT NULL,
  "approval_id" text NOT NULL,
  "organization_id" text NOT NULL,
  "r2_key" text NOT NULL,
  "filename" text NOT NULL,
  "mime_type" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_file_uploads" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "r2_key" text NOT NULL,
  "filename" text NOT NULL,
  "mime_type" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "approval_file_uploads_r2_key_unique" UNIQUE("r2_key")
);
--> statement-breakpoint
ALTER TABLE "approval_files" ADD CONSTRAINT "approval_files_approval_id_approvals_id_fk"
  FOREIGN KEY ("approval_id") REFERENCES "approvals"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "approval_files" ADD CONSTRAINT "approval_files_organization_id_organizations_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "approval_file_uploads" ADD CONSTRAINT "approval_file_uploads_organization_id_organizations_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "approval_files_approval_idx" ON "approval_files" ("approval_id");
--> statement-breakpoint
CREATE INDEX "approval_file_uploads_org_idx" ON "approval_file_uploads" ("organization_id");
