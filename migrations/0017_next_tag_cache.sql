-- OpenNext D1 tag cache (open-next.config.ts: d1NextTagCache, binding NEXT_TAG_CACHE_D1).
-- One row per revalidated tag/path; read on cache hits to decide whether a page is stale.
CREATE TABLE IF NOT EXISTS revalidations (
  tag TEXT NOT NULL,
  revalidatedAt INTEGER NOT NULL,
  stale INTEGER,
  expire INTEGER DEFAULT NULL,
  UNIQUE(tag) ON CONFLICT REPLACE
);
