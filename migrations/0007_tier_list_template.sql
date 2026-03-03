-- Tier list template mode: isTemplate flag and optional source for "created from template"
ALTER TABLE "tier_lists" ADD COLUMN IF NOT EXISTS "is_template" boolean DEFAULT false NOT NULL;
ALTER TABLE "tier_lists" ADD COLUMN IF NOT EXISTS "source_tier_list_id" varchar(36);
DO $$ BEGIN
  ALTER TABLE "tier_lists" ADD CONSTRAINT "tier_lists_source_tier_list_id_tier_lists_id_fk"
    FOREIGN KEY ("source_tier_list_id") REFERENCES "tier_lists"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
