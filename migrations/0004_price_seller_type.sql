-- Price comparison: private sellers vs car dealers, by model year
CREATE TABLE IF NOT EXISTS price_seller_type (
  make_slug      TEXT    NOT NULL,
  model_slug     TEXT    NOT NULL,
  year           INTEGER NOT NULL,
  private_avg    INTEGER,
  private_min    INTEGER,
  private_max    INTEGER,
  dealer_avg     INTEGER,
  dealer_min     INTEGER,
  dealer_max     INTEGER,
  created_at     TEXT    DEFAULT (datetime('now')),
  PRIMARY KEY (make_slug, model_slug, year)
);
