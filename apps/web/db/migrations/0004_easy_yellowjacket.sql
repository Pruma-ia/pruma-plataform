ALTER TABLE "users" ADD COLUMN "accepted_terms_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "marketing_consent" boolean DEFAULT false NOT NULL;
