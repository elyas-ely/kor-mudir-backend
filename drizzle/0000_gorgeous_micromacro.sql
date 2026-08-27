CREATE TYPE "public"."user_role" AS ENUM('admin', 'user');--> statement-breakpoint
CREATE TYPE "public"."contact_kind" AS ENUM('owner', 'worker', 'friend');--> statement-breakpoint
CREATE TYPE "public"."worker_role" AS ENUM('engineer', 'electrician', 'plumber', 'housekeeper', 'painter', 'carpenter', 'gardener', 'security', 'other');--> statement-breakpoint
CREATE TYPE "public"."property_currency" AS ENUM('afghani', 'usd', 'rupee');--> statement-breakpoint
CREATE TYPE "public"."property_purpose" AS ENUM('sale', 'rent', 'mortgage');--> statement-breakpoint
CREATE TYPE "public"."property_size_unit" AS ENUM('sqm', 'sqft');--> statement-breakpoint
CREATE TYPE "public"."property_type" AS ENUM('house', 'apartment', 'villa', 'land', 'garden', 'shop', 'office', 'warehouse', 'building');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"issuer" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_issuer_account_id_unique" UNIQUE("issuer","account_id")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"agency" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"trial_ends_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"kind" "contact_kind" NOT NULL,
	"role" "worker_role",
	"note" text,
	"phone_country_iso" text,
	"phone" text,
	"whatsapp_country_iso" text,
	"whatsapp" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"requirement" text DEFAULT '' NOT NULL,
	"interested_property_type" "property_type",
	"interested_purpose" "property_purpose",
	"phone_country_iso" text,
	"phone" text,
	"whatsapp_country_iso" text,
	"whatsapp" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"owner_name" text NOT NULL,
	"owner_phone_country_iso" text,
	"owner_phone" text,
	"owner_whatsapp_country_iso" text,
	"owner_whatsapp" text,
	"code" text,
	"property_type" "property_type" NOT NULL,
	"purpose" "property_purpose" NOT NULL,
	"price" double precision NOT NULL,
	"currency" "property_currency" DEFAULT 'afghani' NOT NULL,
	"address" text,
	"latitude" double precision,
	"longitude" double precision,
	"bedrooms" integer,
	"bathrooms" integer,
	"floors" integer,
	"kitchens" integer,
	"building_size" double precision,
	"building_size_unit" "property_size_unit",
	"land_size" double precision,
	"land_size_unit" "property_size_unit",
	"year_built" integer,
	"image_key" text,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "contacts_user_id_name_id_idx" ON "contacts" USING btree ("user_id","name","id");--> statement-breakpoint
CREATE INDEX "customers_user_id_id_idx" ON "customers" USING btree ("user_id","id");--> statement-breakpoint
CREATE INDEX "properties_user_id_id_idx" ON "properties" USING btree ("user_id","id");