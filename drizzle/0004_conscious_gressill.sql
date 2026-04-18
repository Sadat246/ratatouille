CREATE TABLE "stripe_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "consumer_profiles" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "consumer_profiles" ADD COLUMN "stripe_payment_method_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "stripe_webhook_events_event_id_unique" ON "stripe_webhook_events" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "stripe_webhook_events_event_type_idx" ON "stripe_webhook_events" USING btree ("event_type");