-- Motorcycles (/motorcycles). Kept apart from car_makes/car_models so brands that make
-- both (Honda, BMW, Suzuki, Kawasaki) do not mix cars and bikes on one page.
-- Rows come from scripts/moto/models.json via scripts/moto/seed.py.
-- Owner reviews and follows for a bike are stored in reviews/model_follows under the
-- make key 'moto-<make>' (see src/lib/motoDb.ts), so car queries never pick them up.
CREATE TABLE IF NOT EXISTS moto_makes (
  slug          TEXT PRIMARY KEY,
  name_he       TEXT NOT NULL,
  name_en       TEXT NOT NULL,
  country       TEXT NOT NULL DEFAULT '',
  logo_url      TEXT NOT NULL DEFAULT '',
  recall_makes  TEXT NOT NULL DEFAULT '[]',   -- JSON: recalls_il.make keys for this brand
  sort_order    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS moto_models (
  make_slug                 TEXT NOT NULL REFERENCES moto_makes(slug),
  slug                      TEXT NOT NULL,
  name_he                   TEXT NOT NULL,
  name_en                   TEXT NOT NULL,
  category                  TEXT NOT NULL,          -- scooter | adventure | naked | sport | offroad | cruiser | electric
  years                     TEXT NOT NULL DEFAULT '[]',
  trims                     TEXT NOT NULL DEFAULT '[]',
  cc_min                    INTEGER,
  cc_max                    INTEGER,
  recall_patterns           TEXT NOT NULL DEFAULT '[]',  -- JSON regexes on recalls_il.degem (upper case, no spaces/dashes)
  leading_image_url         TEXT,
  active_vehicles_il        INTEGER,
  active_vehicles_il_as_of  TEXT,
  sort_order                INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (make_slug, slug)
);
