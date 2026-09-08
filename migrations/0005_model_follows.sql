CREATE TABLE IF NOT EXISTS model_follows (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  user_id     TEXT NOT NULL,
  user_email  TEXT NOT NULL,
  make_slug   TEXT NOT NULL,
  model_slug  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, make_slug, model_slug)
);
CREATE INDEX IF NOT EXISTS idx_model_follows_model ON model_follows(make_slug, model_slug);
