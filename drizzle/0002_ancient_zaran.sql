CREATE TYPE "public"."listing_category" AS ENUM('dairy', 'bakery', 'produce', 'meat', 'pantry', 'frozen', 'beverages', 'snacks', 'household', 'other');--> statement-breakpoint
CREATE TYPE "public"."listing_image_storage_provider" AS ENUM('local', 'cloudinary');--> statement-breakpoint
CREATE TYPE "public"."listing_ocr_status" AS ENUM('not_requested', 'succeeded', 'manual_required', 'unavailable');--> statement-breakpoint
CREATE TYPE "public"."package_date_kind" AS ENUM('best_by', 'best_if_used_by', 'use_by', 'sell_by', 'fresh_by', 'freeze_by', 'expires_on', 'other');--> statement-breakpoint
ALTER TABLE "listing_images" ADD COLUMN "storage_provider" "listing_image_storage_provider" DEFAULT 'local' NOT NULL;--> statement-breakpoint
ALTER TABLE "listing_images" ADD COLUMN "storage_key" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "listing_images" ADD COLUMN "original_filename" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "category" "listing_category" DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "custom_category" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "package_date_label" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "package_date_kind" "package_date_kind" DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "package_date_confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "ocr_status" "listing_ocr_status" DEFAULT 'not_requested' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "ocr_raw_text" text;