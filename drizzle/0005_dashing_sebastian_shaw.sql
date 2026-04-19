CREATE TABLE "uber_direct_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fulfillments" ADD COLUMN "delivery_tracking_url" text;--> statement-breakpoint
CREATE UNIQUE INDEX "uber_direct_webhook_events_event_id_unique" ON "uber_direct_webhook_events" USING btree ("event_id");