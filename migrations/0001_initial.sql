-- D1 Schema: car-issues-il
-- Run via: wrangler d1 execute car-issues-db --file=migrations/0001_initial.sql

CREATE TABLE IF NOT EXISTS car_makes (
  slug        TEXT PRIMARY KEY,
  name_he     TEXT NOT NULL,
  name_en     TEXT NOT NULL,
  country     TEXT NOT NULL DEFAULT '',
  logo_url    TEXT NOT NULL DEFAULT '',
  is_popular  INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS car_models (
  slug        TEXT NOT NULL,
  make_slug   TEXT NOT NULL REFERENCES car_makes(slug),
  name_he     TEXT NOT NULL,
  name_en     TEXT NOT NULL,
  years       TEXT NOT NULL DEFAULT '[]',
  category    TEXT NOT NULL DEFAULT 'sedan',
  trims       TEXT NOT NULL DEFAULT '[]',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (make_slug, slug)
);

CREATE TABLE IF NOT EXISTS reviews (
  id          TEXT PRIMARY KEY,
  make_slug   TEXT NOT NULL,
  model_slug  TEXT NOT NULL,
  year        INTEGER NOT NULL,
  rating      INTEGER NOT NULL,
  title       TEXT NOT NULL DEFAULT '',
  body        TEXT NOT NULL DEFAULT '',
  title_en    TEXT,
  body_en     TEXT,
  category    TEXT NOT NULL DEFAULT 'general',
  sub_model   TEXT,
  mileage     INTEGER,
  author      TEXT NOT NULL DEFAULT '',
  user_id     TEXT,
  helpful     INTEGER NOT NULL DEFAULT 0,
  dislikes    INTEGER NOT NULL DEFAULT 0,
  images      TEXT NOT NULL DEFAULT '[]',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reviews_make_model ON reviews (make_slug, model_slug);
CREATE INDEX IF NOT EXISTS idx_reviews_user      ON reviews (user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created   ON reviews (created_at DESC);

CREATE TABLE IF NOT EXISTS expert_reviews (
  id                  TEXT PRIMARY KEY,
  make_slug           TEXT NOT NULL,
  model_slug          TEXT NOT NULL,
  year                INTEGER,
  source_name         TEXT NOT NULL DEFAULT '',
  source_url          TEXT NOT NULL DEFAULT '',
  original_title      TEXT NOT NULL DEFAULT '',
  summary_he          TEXT NOT NULL DEFAULT '',
  local_summary_he    TEXT,
  global_summary_he   TEXT,
  local_score         REAL,
  global_score        REAL,
  top_score           REAL,
  pros                TEXT NOT NULL DEFAULT '[]',
  cons                TEXT NOT NULL DEFAULT '[]',
  local_post_count    INTEGER NOT NULL DEFAULT 0,
  global_post_count   INTEGER NOT NULL DEFAULT 0,
  sources_breakdown   TEXT NOT NULL DEFAULT '[]',
  scraped_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_expert_make_model ON expert_reviews (make_slug, model_slug);

CREATE TABLE IF NOT EXISTS review_likes (
  review_id   TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  PRIMARY KEY (review_id, user_id)
);

CREATE TABLE IF NOT EXISTS profiles (
  id          TEXT PRIMARY KEY,
  email       TEXT,
  is_admin    INTEGER NOT NULL DEFAULT 0
);
