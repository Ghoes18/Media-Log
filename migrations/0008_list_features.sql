ALTER TABLE "lists" ADD COLUMN "source_list_id" varchar(36) REFERENCES "lists"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "lists" ADD COLUMN "share_token" varchar(64);--> statement-breakpoint
CREATE UNIQUE INDEX "lists_share_token_unique" ON "lists" ("share_token") WHERE "share_token" IS NOT NULL;