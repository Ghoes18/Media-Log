ALTER TABLE "profile_settings"
  ADD COLUMN IF NOT EXISTS "profile_custom_html" text,
  ADD COLUMN IF NOT EXISTS "profile_custom_css" text;
