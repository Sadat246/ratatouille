CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"expiration_time" timestamp with time zone,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auctions" ADD COLUMN "current_bid_amount_cents" integer;--> statement-breakpoint
ALTER TABLE "auctions" ADD COLUMN "current_leader_bid_id" uuid;--> statement-breakpoint
ALTER TABLE "auctions" ADD COLUMN "current_leader_user_id" uuid;--> statement-breakpoint
ALTER TABLE "auctions" ADD COLUMN "bid_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "auctions" ADD COLUMN "last_bid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "consumer_profiles" ADD COLUMN "has_mock_card_on_file" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "consumer_profiles" ADD COLUMN "mock_card_brand" text;--> statement-breakpoint
ALTER TABLE "consumer_profiles" ADD COLUMN "mock_card_last4" text;--> statement-breakpoint
ALTER TABLE "consumer_profiles" ADD COLUMN "mock_card_added_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_endpoint_unique" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_current_leader_user_id_users_id_fk" FOREIGN KEY ("current_leader_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;