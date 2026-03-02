-- Create preset_list_likes table
CREATE TABLE "preset_list_likes" (
	"user_id" varchar(36) NOT NULL,
	"preset_list_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "preset_list_likes_user_id_preset_list_id_pk" PRIMARY KEY("user_id","preset_list_id")
);
--> statement-breakpoint
ALTER TABLE "preset_list_likes" ADD CONSTRAINT "preset_list_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- Create preset_list_comments table
CREATE TABLE "preset_list_comments" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"preset_list_id" text NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "preset_list_comments" ADD CONSTRAINT "preset_list_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- Create user_preset_progress table
CREATE TABLE "user_preset_progress" (
	"user_id" varchar(36) NOT NULL,
	"preset_list_id" text NOT NULL,
	"external_id" text NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_preset_progress_user_id_preset_list_id_external_id_pk" PRIMARY KEY("user_id","preset_list_id","external_id")
);
--> statement-breakpoint
ALTER TABLE "user_preset_progress" ADD CONSTRAINT "user_preset_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
