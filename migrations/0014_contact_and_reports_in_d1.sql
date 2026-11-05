-- Contact messages and review reports move from Supabase to D1 (D1 is the source of truth).
-- /api/contact and /api/reviews/[id]/report now write here, and the admin page reads here.
-- Before this, the contact form wrote to Supabase while the admin read D1, so new messages never
-- showed in the admin (the D1 table had none of the status/reply columns it queries).
--
-- Applied to production D1 on 2026-11-05 (do not re-run; ALTER ADD COLUMN is not idempotent).
ALTER TABLE contact_messages ADD COLUMN status TEXT NOT NULL DEFAULT 'unread';
ALTER TABLE contact_messages ADD COLUMN read INTEGER NOT NULL DEFAULT 0;
ALTER TABLE contact_messages ADD COLUMN reply_body TEXT;
ALTER TABLE contact_messages ADD COLUMN replied_at TEXT;
CREATE TABLE IF NOT EXISTS review_reports (
  id         TEXT PRIMARY KEY,
  review_id  TEXT NOT NULL,
  reason     TEXT NOT NULL,
  ip         TEXT NOT NULL DEFAULT 'unknown',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (review_id, ip)
);
CREATE INDEX IF NOT EXISTS idx_review_reports_review ON review_reports(review_id);
