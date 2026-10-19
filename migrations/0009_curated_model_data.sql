-- Stores the complete curated JSON payload for models introduced by the
-- 2026-10 missing-models import. Existing rows remain unchanged.
ALTER TABLE expert_reviews ADD COLUMN model_data_json TEXT;
