-- Performance spec columns for car_trims
-- Run via: npx wrangler d1 execute carissues-db --remote --file=migrations/0003_performance_specs.sql

ALTER TABLE car_trims ADD COLUMN acceleration_0_100 REAL;      -- 0-100 km/h in seconds
ALTER TABLE car_trims ADD COLUMN top_speed_kmh      INTEGER;   -- km/h
ALTER TABLE car_trims ADD COLUMN torque_nm          INTEGER;   -- Nm
ALTER TABLE car_trims ADD COLUMN fuel_consumption   REAL;      -- L/100km (combined)
ALTER TABLE car_trims ADD COLUMN cargo_liters       INTEGER;   -- boot/trunk in liters
ALTER TABLE car_trims ADD COLUMN curb_weight_kg     INTEGER;   -- kg
