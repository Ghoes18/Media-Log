CREATE TABLE IF NOT EXISTS "tier_list_item_reactions" (
  "user_id" varchar(36) NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "tier_list_item_id" varchar(36) NOT NULL REFERENCES "tier_list_items"("id") ON DELETE CASCADE,
  "reaction" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "tier_list_item_reactions_pkey" PRIMARY KEY ("user_id", "tier_list_item_id")
);
