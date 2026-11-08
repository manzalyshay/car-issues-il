-- Applied to production D1 on 2026-11-09 (CREATE TABLE/INDEX IF NOT EXISTS - safe to re-run).
-- Page-view log: one row per human page view (HTML document requests only - no API,
-- static assets or known bots). Written by worker-entry.js via ctx.waitUntil, so it never
-- slows the response. Internal use only. Personal data (IP + approximate location):
-- rows older than 90 days are purged by the same writer, and the privacy policy says so.
CREATE TABLE IF NOT EXISTS page_visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  ip TEXT,
  site TEXT,                -- 'he' (carissues.co.il) | 'en' (carissues.net)
  path TEXT NOT NULL,       -- pathname
  query TEXT,               -- query string incl. leading '?', or NULL
  referer TEXT,
  country TEXT, region TEXT, city TEXT, postal_code TEXT,
  latitude TEXT, longitude TEXT, timezone TEXT,
  asn INTEGER, asn_org TEXT, -- network / ISP
  device TEXT, os TEXT, browser TEXT,
  user_agent TEXT, lang TEXT
);
CREATE INDEX IF NOT EXISTS idx_page_visits_created ON page_visits(created_at);
CREATE INDEX IF NOT EXISTS idx_page_visits_ip ON page_visits(ip, created_at);
