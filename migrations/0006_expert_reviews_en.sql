-- Add English translation columns to expert_reviews
ALTER TABLE expert_reviews ADD COLUMN IF NOT EXISTS pros_en TEXT;
ALTER TABLE expert_reviews ADD COLUMN IF NOT EXISTS cons_en TEXT;
ALTER TABLE expert_reviews ADD COLUMN IF NOT EXISTS local_summary_en TEXT;
ALTER TABLE expert_reviews ADD COLUMN IF NOT EXISTS global_summary_en TEXT;
ALTER TABLE expert_reviews ADD COLUMN IF NOT EXISTS summary_en TEXT;
