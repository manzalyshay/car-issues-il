-- Vehicle-lookup search log: plate searched + who searched (IP, Cloudflare geolocation,
-- device). Personal data - rows older than 90 days are purged by
-- /api/vehicle-lookup/log, and the privacy policy discloses this collection.
CREATE TABLE IF NOT EXISTS vehicle_lookup_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  plate TEXT NOT NULL,
  country_kind TEXT,        -- 'il' | 'uk'
  found INTEGER,            -- 1 found, 0 not found
  ip TEXT,
  country TEXT, region TEXT, city TEXT,
  latitude TEXT, longitude TEXT, timezone TEXT,
  asn_org TEXT,             -- network/ISP name
  device TEXT, os TEXT, browser TEXT,
  user_agent TEXT, referer TEXT, lang TEXT,
  site TEXT                 -- 'he' (carissues.co.il) | 'en' (carissues.net)
);
CREATE INDEX IF NOT EXISTS idx_vehicle_lookup_log_created ON vehicle_lookup_log(created_at);
