CREATE TABLE "consumer_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"location_label" text NOT NULL,
	"postal_code" text,
	"city" text,
	"state" text,
	"country_code" text,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"geocode_provider" text NOT NULL,
	"geocode_feature_id" text,
	"geocoded_at" timestamp with time zone NOT NULL,
	"delivery_address_line_1" text NOT NULL,
	"delivery_address_line_2" text,
	"delivery_city" text NOT NULL,
	"delivery_state" text NOT NULL,
	"delivery_postal_code" text NOT NULL,
	"delivery_country_code" text NOT NULL,
	"delivery_latitude" double precision NOT NULL,
	"delivery_longitude" double precision NOT NULL,
	"delivery_place_id" text,
	"delivery_geocode_provider" text NOT NULL,
	"delivery_geocoded_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_accounts" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "auth_accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "auth_verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_google_subject_unique";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "preferred_role" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."user_role";--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('consumer', 'business');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "preferred_role" SET DATA TYPE "public"."user_role" USING "preferred_role"::"public"."user_role";--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "address_label" text;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "country_code" text;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "geocode_provider" text;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "geocode_feature_id" text;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "geocoded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "pickup_hours" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "image" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarding_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "consumer_profiles" ADD CONSTRAINT "consumer_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "consumer_profiles_user_unique" ON "consumer_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_accounts_user_idx" ON "auth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("preferred_role");--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "google_subject";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "phone";