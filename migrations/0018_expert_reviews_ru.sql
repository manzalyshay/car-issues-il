-- Applied to production D1 on 2026-11-12 (do not re-run; ALTER ADD COLUMN is not idempotent).
-- Russian pros/cons for the /ru compare pages, JSON arrays in the same order as pros_en/cons_en.
-- NULL means no Russian yet: the page falls back to the English lists.
ALTER TABLE expert_reviews ADD COLUMN pros_ru TEXT;
ALTER TABLE expert_reviews ADD COLUMN cons_ru TEXT;
