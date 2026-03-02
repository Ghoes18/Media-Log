-- Add isRanked and tags to lists table
ALTER TABLE "lists" ADD COLUMN "is_ranked" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "lists" ADD COLUMN "tags" text[] DEFAULT '{}'::text[];
--> statement-breakpoint
-- Add position and note to list_items table
ALTER TABLE "list_items" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "list_items" ADD COLUMN "note" text;
--> statement-breakpoint
-- Create list_likes table
CREATE TABLE "list_likes" (
	"user_id" varchar(36) NOT NULL,
	"list_id" varchar(36) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "list_likes_user_id_list_id_pk" PRIMARY KEY("user_id","list_id")
);
--> statement-breakpoint
ALTER TABLE "list_likes" ADD CONSTRAINT "list_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "list_likes" ADD CONSTRAINT "list_likes_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- Create list_comments table
CREATE TABLE "list_comments" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" varchar(36) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "list_comments" ADD CONSTRAINT "list_comments_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "list_comments" ADD CONSTRAINT "list_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
