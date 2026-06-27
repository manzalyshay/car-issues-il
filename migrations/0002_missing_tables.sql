-- D1 Schema: missing tables not in 0001_initial.sql

CREATE TABLE IF NOT EXISTS car_trims (
  id           TEXT PRIMARY KEY,
  make_slug    TEXT NOT NULL,
  model_slug   TEXT NOT NULL,
  name         TEXT NOT NULL,
  model_year   INTEGER,
  engine_type  TEXT,
  engine_cc    INTEGER,
  engine_hp    INTEGER,
  transmission TEXT,
  drive        TEXT,
  seats        TEXT,
  seat_count   INTEGER,
  screen_size  REAL,
  features     TEXT NOT NULL DEFAULT '[]',
  price_ils    INTEGER,
  is_israel    INTEGER NOT NULL DEFAULT 0,
  sort_order   INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_car_trims_make_model ON car_trims (make_slug, model_slug);

CREATE TABLE IF NOT EXISTS car_images (
  id             TEXT PRIMARY KEY,
  make_slug      TEXT NOT NULL,
  model_slug     TEXT NOT NULL,
  year           INTEGER,
  url            TEXT NOT NULL,
  thumbnail_url  TEXT,
  title          TEXT,
  author         TEXT,
  license        TEXT,
  source         TEXT NOT NULL DEFAULT '',
  width          INTEGER,
  height         INTEGER,
  hidden         INTEGER,
  hidden_reason  TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_car_images_make_model ON car_images (make_slug, model_slug);

CREATE TABLE IF NOT EXISTS car_videos (
  id             TEXT PRIMARY KEY,
  make_slug      TEXT NOT NULL,
  model_slug     TEXT NOT NULL,
  youtube_id     TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  channel        TEXT NOT NULL DEFAULT '',
  published_at   TEXT NOT NULL DEFAULT '',
  thumbnail_url  TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_car_videos_make_model ON car_videos (make_slug, model_slug);

CREATE TABLE IF NOT EXISTS car_3d_models (
  id               TEXT PRIMARY KEY,
  make_slug        TEXT NOT NULL,
  model_slug       TEXT NOT NULL,
  sketchfab_uid    TEXT NOT NULL UNIQUE,
  sketchfab_name   TEXT NOT NULL DEFAULT '',
  sketchfab_author TEXT NOT NULL DEFAULT '',
  license          TEXT,
  reel_url         TEXT,
  hidden           INTEGER
);

CREATE INDEX IF NOT EXISTS idx_car_3d_models_make_model ON car_3d_models (make_slug, model_slug);

CREATE TABLE IF NOT EXISTS recalls_cache (
  id               TEXT PRIMARY KEY,
  make             TEXT NOT NULL,
  model            TEXT NOT NULL,
  date             TEXT NOT NULL DEFAULT '',
  component_he     TEXT NOT NULL DEFAULT '',
  summary_he       TEXT NOT NULL DEFAULT '',
  consequence_he   TEXT NOT NULL DEFAULT '',
  remedy_he        TEXT NOT NULL DEFAULT '',
  manufacturer     TEXT NOT NULL DEFAULT '',
  recall_year      INTEGER
);

CREATE INDEX IF NOT EXISTS idx_recalls_cache_make_model ON recalls_cache (make, model);

CREATE TABLE IF NOT EXISTS repair_costs (
  id            TEXT PRIMARY KEY,
  repair_key    TEXT NOT NULL,
  repair_name_he TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'general',
  applies_to    TEXT NOT NULL DEFAULT 'all',
  cost_min_ils  INTEGER,
  cost_max_ils  INTEGER,
  cost_avg_ils  INTEGER,
  notes         TEXT
);

CREATE INDEX IF NOT EXISTS idx_repair_costs_applies_to ON repair_costs (applies_to);

CREATE TABLE IF NOT EXISTS user_repair_costs (
  id             TEXT PRIMARY KEY,
  make_slug      TEXT NOT NULL,
  model_slug     TEXT NOT NULL,
  year           INTEGER,
  mileage        INTEGER,
  repair_key     TEXT NOT NULL,
  repair_name_he TEXT NOT NULL,
  cost_ils       INTEGER NOT NULL,
  workshop_type  TEXT,
  notes          TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_user_repair_costs_make_model ON user_repair_costs (make_slug, model_slug);

CREATE TABLE IF NOT EXISTS admin_logs (
  id         TEXT PRIMARY KEY,
  level      TEXT NOT NULL DEFAULT 'info',
  source     TEXT NOT NULL DEFAULT '',
  message    TEXT NOT NULL DEFAULT '',
  details    TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS review_replies (
  id          TEXT PRIMARY KEY,
  review_id   TEXT NOT NULL,
  author_name TEXT NOT NULL,
  user_id     TEXT,
  body        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_review_replies_review_id ON review_replies (review_id);

CREATE TABLE IF NOT EXISTS contact_messages (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL DEFAULT '',
  email      TEXT NOT NULL DEFAULT '',
  subject    TEXT NOT NULL DEFAULT '',
  message    TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS social_posts (
  id          TEXT PRIMARY KEY,
  platform    TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'pending',
  content     TEXT NOT NULL DEFAULT '',
  image_url   TEXT,
  post_id     TEXT,
  error       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
