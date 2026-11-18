-- Where car_trims.price_ils came from: 'auto.co.il' for list prices synced by
-- scripts/sync-autocoil-prices.mjs; NULL for older hand-entered estimates.
ALTER TABLE car_trims ADD COLUMN price_source TEXT;
ALTER TABLE car_trims ADD COLUMN price_checked_at TEXT;
