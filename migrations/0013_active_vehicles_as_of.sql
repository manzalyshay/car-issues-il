-- Date the Israeli active-vehicle counts (car_models.active_vehicles_il) were taken from the
-- Ministry of Transport registry. Refreshed every 3 days by .github/workflows/il-fleet-counts.yml
-- (scripts/il-fleet/fleet.py). The model page shows it next to the count.
--
-- Applied to production D1 on 2026-11-05 (do not re-run; ALTER ADD COLUMN is not idempotent),
-- followed by: UPDATE car_models SET active_vehicles_il_as_of = '2026-11-05';
ALTER TABLE car_models ADD COLUMN active_vehicles_il_as_of TEXT;
