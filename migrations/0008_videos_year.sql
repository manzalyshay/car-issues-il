-- Add year column to car_videos for per-year video support
ALTER TABLE car_videos ADD COLUMN year INTEGER;
CREATE INDEX IF NOT EXISTS idx_car_videos_year ON car_videos (make_slug, model_slug, year);
