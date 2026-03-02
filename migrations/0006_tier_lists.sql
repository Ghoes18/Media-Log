-- Create tier_lists table
CREATE TABLE "tier_lists" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" varchar(36) NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '',
	"visibility" text DEFAULT 'private' NOT NULL,
	"tags" text[] DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tier_lists" ADD CONSTRAINT "tier_lists_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- Create tier_list_tiers table
CREATE TABLE "tier_list_tiers" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tier_list_id" varchar(36) NOT NULL,
	"label" text NOT NULL,
	"color" text DEFAULT '#94a3b8' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tier_list_tiers" ADD CONSTRAINT "tier_list_tiers_tier_list_id_tier_lists_id_fk" FOREIGN KEY ("tier_list_id") REFERENCES "public"."tier_lists"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- Create tier_list_items table
CREATE TABLE "tier_list_items" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tier_list_id" varchar(36) NOT NULL,
	"media_id" varchar(36) NOT NULL,
	"tier_id" varchar(36),
	"added_by_user_id" varchar(36) NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"note" text,
	"added_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tier_list_items_list_media_unique" UNIQUE("tier_list_id","media_id")
);
--> statement-breakpoint
ALTER TABLE "tier_list_items" ADD CONSTRAINT "tier_list_items_tier_list_id_tier_lists_id_fk" FOREIGN KEY ("tier_list_id") REFERENCES "public"."tier_lists"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tier_list_items" ADD CONSTRAINT "tier_list_items_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tier_list_items" ADD CONSTRAINT "tier_list_items_tier_id_tier_list_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."tier_list_tiers"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tier_list_items" ADD CONSTRAINT "tier_list_items_added_by_user_id_users_id_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- Create tier_list_collaborators table
CREATE TABLE "tier_list_collaborators" (
	"tier_list_id" varchar(36) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tier_list_collaborators_tier_list_id_user_id_pk" PRIMARY KEY("tier_list_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "tier_list_collaborators" ADD CONSTRAINT "tier_list_collaborators_tier_list_id_tier_lists_id_fk" FOREIGN KEY ("tier_list_id") REFERENCES "public"."tier_lists"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tier_list_collaborators" ADD CONSTRAINT "tier_list_collaborators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- Create tier_list_invitations table
CREATE TABLE "tier_list_invitations" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tier_list_id" varchar(36) NOT NULL,
	"invited_user_id" varchar(36) NOT NULL,
	"invited_by_user_id" varchar(36) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tier_list_invitations" ADD CONSTRAINT "tier_list_invitations_tier_list_id_tier_lists_id_fk" FOREIGN KEY ("tier_list_id") REFERENCES "public"."tier_lists"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tier_list_invitations" ADD CONSTRAINT "tier_list_invitations_invited_user_id_users_id_fk" FOREIGN KEY ("invited_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tier_list_invitations" ADD CONSTRAINT "tier_list_invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- Create tier_list_likes table
CREATE TABLE "tier_list_likes" (
	"user_id" varchar(36) NOT NULL,
	"tier_list_id" varchar(36) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tier_list_likes_user_id_tier_list_id_pk" PRIMARY KEY("user_id","tier_list_id")
);
--> statement-breakpoint
ALTER TABLE "tier_list_likes" ADD CONSTRAINT "tier_list_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tier_list_likes" ADD CONSTRAINT "tier_list_likes_tier_list_id_tier_lists_id_fk" FOREIGN KEY ("tier_list_id") REFERENCES "public"."tier_lists"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- Create tier_list_comments table
CREATE TABLE "tier_list_comments" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tier_list_id" varchar(36) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tier_list_comments" ADD CONSTRAINT "tier_list_comments_tier_list_id_tier_lists_id_fk" FOREIGN KEY ("tier_list_id") REFERENCES "public"."tier_lists"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tier_list_comments" ADD CONSTRAINT "tier_list_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
