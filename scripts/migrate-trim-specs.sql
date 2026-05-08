-- CarIssues IL — Trim Specs Migration
-- Run in: Supabase Dashboard → SQL Editor → New Query

CREATE TABLE IF NOT EXISTS car_trims (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  make_slug    TEXT NOT NULL,
  model_slug   TEXT NOT NULL,
  name         TEXT NOT NULL,          -- 'Urban', 'Comfort', 'Prestige', etc.
  sort_order   INTEGER NOT NULL DEFAULT 0,

  -- Engine
  engine_type  TEXT,                   -- 'petrol' | 'hybrid' | 'phev' | 'electric' | 'diesel'
  engine_cc    INTEGER,                -- displacement in cc, e.g. 1798
  engine_hp    INTEGER,                -- horsepower
  transmission TEXT,                   -- 'manual' | 'automatic' | 'cvt' | 'dct'
  drive        TEXT DEFAULT 'fwd',     -- 'fwd' | 'rwd' | 'awd'

  -- Interior
  seats        TEXT DEFAULT 'fabric',  -- 'fabric' | 'leatherette' | 'leather'
  seat_count   INTEGER DEFAULT 5,
  screen_size  NUMERIC(3,1),           -- inches, e.g. 10.5

  -- Feature flags (array of feature keys)
  features     TEXT[] NOT NULL DEFAULT '{}',

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(make_slug, model_slug, name)
);

CREATE INDEX IF NOT EXISTS car_trims_make_model ON car_trims (make_slug, model_slug);

ALTER TABLE car_trims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "car_trims_public_read" ON car_trims FOR SELECT USING (true);
-- Writes only via service_role key (bypasses RLS)
