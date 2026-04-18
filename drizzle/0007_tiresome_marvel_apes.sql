CREATE TYPE "public"."bug_report_reporter_role" AS ENUM('anonymous', 'consumer', 'business');--> statement-breakpoint
CREATE TABLE "bug_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"reporter_user_id" uuid,
	"reporter_role" "bug_report_reporter_role" DEFAULT 'anonymous' NOT NULL,
	"page_url" text NOT NULL,
	"page_path" text NOT NULL,
	"viewport" text NOT NULL,
	"user_agent" text,
	"summary" text NOT NULL,
	"description" text NOT NULL,
	"markdown" text NOT NULL,
	"screenshot_data_url" text,
	"capture_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bug_reports" ADD CONSTRAINT "bug_reports_reporter_user_id_users_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bug_reports_public_id_unique" ON "bug_reports" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "bug_reports_created_at_idx" ON "bug_reports" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "bug_reports_reporter_role_idx" ON "bug_reports" USING btree ("reporter_role");