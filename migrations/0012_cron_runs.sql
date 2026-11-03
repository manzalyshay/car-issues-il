-- Recall/news pipeline support: run ledger, job cursors, freshness stamps and a
-- campaign→model link table.
--
-- ALL statements in this file were applied to production D1 on 2026-11-03
-- (do not re-run; ALTER ADD COLUMN is not idempotent). Applied first:
--   CREATE TABLE cron_state (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT);
--   ALTER TABLE recalls_cache ADD COLUMN first_seen_at TEXT;
--   CREATE TABLE recalls_cache_models (id, make, model, model_years, PRIMARY KEY (id, make, model));
--   CREATE INDEX idx_recalls_cache_models_mm ON recalls_cache_models(make, model);
--   INSERT OR IGNORE INTO recalls_cache_models … SELECT … FROM recalls_cache;   (1,920 links)
--
-- Applied second (before the deploy):

-- Run ledger for scheduled jobs: one row per job run, plus one per cron dispatch
-- written by worker-entry.js recording the HTTP status the job route returned.
CREATE TABLE IF NOT EXISTS cron_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job TEXT NOT NULL,              -- 'refresh-recalls' | 'sync-israeli-recalls' | 'refresh-news' | 'dispatch:<path>'
  trigger TEXT,                   -- 'scheduled' | 'manual' | cron expression for dispatch rows
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL,           -- 'running' | 'ok' | 'partial' | 'failed'
  http_status INTEGER,            -- dispatch rows only
  detail TEXT                     -- JSON: fetched / written / errors / cursor ...
);
CREATE INDEX IF NOT EXISTS idx_cron_runs_job_started ON cron_runs(job, started_at);

-- When each NHTSA campaign row was last confirmed by a sync run.
ALTER TABLE recalls_cache ADD COLUMN last_seen_at TEXT;

-- When each Israeli notice row was last confirmed against data.gov.il.
ALTER TABLE recalls_il ADD COLUMN synced_at TEXT;
