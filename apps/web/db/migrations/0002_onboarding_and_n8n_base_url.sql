ALTER TABLE "organizations" ADD COLUMN "n8n_base_url" text;

ALTER TABLE "approvals" ADD COLUMN "callback_retries" integer DEFAULT 0 NOT NULL;

CREATE TABLE "onboarding_tokens" (
  "id" text PRIMARY KEY NOT NULL,
  "token_hash" text NOT NULL,
  "organization_id" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "used_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "onboarding_tokens_token_hash_unique" UNIQUE("token_hash")
);

ALTER TABLE "onboarding_tokens" ADD CONSTRAINT "onboarding_tokens_organization_id_organizations_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE cascade ON UPDATE no action;
