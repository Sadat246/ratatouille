CREATE TYPE "public"."auction_result" AS ENUM('pending', 'reserve_not_met', 'winning_bid', 'buyout', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."auction_status" AS ENUM('scheduled', 'active', 'closed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."bid_kind" AS ENUM('standard', 'buyout');--> statement-breakpoint
CREATE TYPE "public"."bid_status" AS ENUM('active', 'outbid', 'winning', 'withdrawn', 'voided');--> statement-breakpoint
CREATE TYPE "public"."delivery_provider" AS ENUM('none', 'uber_direct');--> statement-breakpoint
CREATE TYPE "public"."fulfillment_mode" AS ENUM('pickup', 'delivery');--> statement-breakpoint
CREATE TYPE "public"."fulfillment_status" AS ENUM('pending_choice', 'awaiting_business', 'ready_for_pickup', 'picked_up', 'delivery_requested', 'out_for_delivery', 'delivered', 'cancelled', 'failed');--> statement-breakpoint
CREATE TYPE "public"."business_membership_role" AS ENUM('owner', 'manager', 'staff');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('consumer', 'business', 'admin');--> statement-breakpoint
CREATE TYPE "public"."listing_image_kind" AS ENUM('product', 'seal', 'expiry', 'other');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('draft', 'scheduled', 'active', 'sold', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending_authorization', 'authorized', 'capture_requested', 'captured', 'failed', 'refunded', 'not_required');--> statement-breakpoint
CREATE TYPE "public"."settlement_status" AS ENUM('pending', 'ready_for_fulfillment', 'completed', 'failed', 'voided');--> statement-breakpoint
CREATE TABLE "auctions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"status" "auction_status" DEFAULT 'scheduled' NOT NULL,
	"result" "auction_result" DEFAULT 'pending' NOT NULL,
	"reserve_price_cents" integer NOT NULL,
	"buyout_price_cents" integer,
	"scheduled_start_at" timestamp with time zone,
	"scheduled_end_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"winning_bid_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bids" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auction_id" uuid NOT NULL,
	"consumer_user_id" uuid NOT NULL,
	"kind" "bid_kind" DEFAULT 'standard' NOT NULL,
	"status" "bid_status" DEFAULT 'active' NOT NULL,
	"amount_cents" integer NOT NULL,
	"placed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "business_membership_role" DEFAULT 'staff' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"support_email" text,
	"phone" text,
	"address_line_1" text,
	"address_line_2" text,
	"city" text,
	"state" text,
	"postal_code" text,
	"latitude" double precision,
	"longitude" double precision,
	"pickup_instructions" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fulfillments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"settlement_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"mode" "fulfillment_mode" DEFAULT 'pickup' NOT NULL,
	"status" "fulfillment_status" DEFAULT 'pending_choice' NOT NULL,
	"delivery_provider" "delivery_provider" DEFAULT 'none' NOT NULL,
	"pickup_code" text,
	"pickup_code_expires_at" timestamp with time zone,
	"recipient_name" text,
	"recipient_phone" text,
	"delivery_quote_id" text,
	"delivery_reference_id" text,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"preferred_role" "user_role",
	"google_subject" text,
	"phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_google_subject_unique" UNIQUE("google_subject")
);
--> statement-breakpoint
CREATE TABLE "listing_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"kind" "listing_image_kind" DEFAULT 'other' NOT NULL,
	"image_url" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"status" "listing_status" DEFAULT 'draft' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"reserve_price_cents" integer,
	"buyout_price_cents" integer,
	"expiry_text" text,
	"expires_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auction_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"buyer_user_id" uuid,
	"winning_bid_id" uuid,
	"status" "settlement_status" DEFAULT 'pending' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'pending_authorization' NOT NULL,
	"gross_amount_cents" integer,
	"platform_fee_cents" integer DEFAULT 0 NOT NULL,
	"seller_net_amount_cents" integer,
	"currency" text DEFAULT 'usd' NOT NULL,
	"processor" text,
	"processor_intent_id" text,
	"authorized_at" timestamp with time zone,
	"captured_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_consumer_user_id_users_id_fk" FOREIGN KEY ("consumer_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_memberships" ADD CONSTRAINT "business_memberships_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_memberships" ADD CONSTRAINT "business_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillments" ADD CONSTRAINT "fulfillments_settlement_id_settlements_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."settlements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillments" ADD CONSTRAINT "fulfillments_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_images" ADD CONSTRAINT "listing_images_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_buyer_user_id_users_id_fk" FOREIGN KEY ("buyer_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_winning_bid_id_bids_id_fk" FOREIGN KEY ("winning_bid_id") REFERENCES "public"."bids"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "auctions_listing_unique" ON "auctions" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "auctions_business_status_idx" ON "auctions" USING btree ("business_id","status");--> statement-breakpoint
CREATE INDEX "auctions_status_end_idx" ON "auctions" USING btree ("status","scheduled_end_at");--> statement-breakpoint
CREATE INDEX "bids_auction_placed_idx" ON "bids" USING btree ("auction_id","placed_at");--> statement-breakpoint
CREATE INDEX "bids_user_placed_idx" ON "bids" USING btree ("consumer_user_id","placed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "business_memberships_business_user_unique" ON "business_memberships" USING btree ("business_id","user_id");--> statement-breakpoint
CREATE INDEX "business_memberships_user_idx" ON "business_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "businesses_slug_unique" ON "businesses" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "fulfillments_settlement_unique" ON "fulfillments" USING btree ("settlement_id");--> statement-breakpoint
CREATE INDEX "fulfillments_status_idx" ON "fulfillments" USING btree ("status","mode");--> statement-breakpoint
CREATE INDEX "listing_images_listing_idx" ON "listing_images" USING btree ("listing_id");--> statement-breakpoint
CREATE UNIQUE INDEX "listing_images_listing_kind_order_unique" ON "listing_images" USING btree ("listing_id","kind","sort_order");--> statement-breakpoint
CREATE INDEX "listings_business_idx" ON "listings" USING btree ("business_id","status");--> statement-breakpoint
CREATE INDEX "listings_expires_at_idx" ON "listings" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "settlements_auction_unique" ON "settlements" USING btree ("auction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "settlements_listing_unique" ON "settlements" USING btree ("listing_id");--> statement-breakpoint
CREATE UNIQUE INDEX "settlements_winning_bid_unique" ON "settlements" USING btree ("winning_bid_id");--> statement-breakpoint
CREATE INDEX "settlements_business_status_idx" ON "settlements" USING btree ("business_id","status");