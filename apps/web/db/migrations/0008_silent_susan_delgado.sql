CREATE TABLE "email_otp_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "setup_charge_asaas_id" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "setup_charge_amount" integer;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "setup_charge_installments" integer;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "setup_charge_status" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "onboarding_whatsapp_clicked_at" timestamp;--> statement-breakpoint
ALTER TABLE "email_otp_tokens" ADD CONSTRAINT "email_otp_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;