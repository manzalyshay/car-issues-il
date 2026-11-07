-- Visitor reports of a browser tab crashing while a Sketchfab 3D model was on screen
-- (see src/lib/viewer3dGuard.ts and /api/car-3d/crash). One row per model per visitor;
-- a model reported by CRASH_HIDE_THRESHOLD distinct visitors within 7 days is hidden.
-- ip_hash is a salted SHA-256 of the visitor IP: no raw IPs are stored.
--
-- Applied to production D1 on 2026-11-07.
CREATE TABLE IF NOT EXISTS car_3d_crash_reports (
  sketchfab_uid TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (sketchfab_uid, ip_hash)
);
CREATE INDEX IF NOT EXISTS idx_car_3d_crash_reports_created ON car_3d_crash_reports(created_at);
