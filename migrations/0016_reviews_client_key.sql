-- Applied to production D1 on 2026-11-12 (do not re-run; ALTER ADD COLUMN is not idempotent).
-- Idempotency key for review submissions: the form generates one key per fill and sends it
-- with every attempt, so a retry after a failed/lost response returns the review that was
-- already saved instead of publishing it twice. NULL for rows created before this migration
-- (a UNIQUE index allows any number of NULLs).
ALTER TABLE reviews ADD COLUMN client_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_client_key ON reviews (client_key);
