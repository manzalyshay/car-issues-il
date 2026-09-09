-- Car news scraped from global sources, AI-rewritten in Hebrew editorial style
CREATE TABLE IF NOT EXISTS car_news (
  id TEXT PRIMARY KEY,            -- SHA-1 of original_url (hex)
  source TEXT NOT NULL,           -- 'motor1', 'caranddriver', 'cartube', etc.
  original_url TEXT NOT NULL UNIQUE,
  title_he TEXT,                  -- AI-rewritten Hebrew title
  body_he TEXT,                   -- AI-rewritten Hebrew body
  title_en TEXT,                  -- Original English title
  body_en TEXT,                   -- Original English excerpt/body
  image_url TEXT,
  published_at TEXT,              -- ISO datetime from feed
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS car_news_published_at ON car_news(published_at DESC);
CREATE INDEX IF NOT EXISTS car_news_source ON car_news(source);
