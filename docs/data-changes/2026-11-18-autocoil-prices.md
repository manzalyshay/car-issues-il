# 2026-11-18: car_trims prices from auto.co.il

- Migration `migrations/0019_trim_price_source.sql` added `price_source` and `price_checked_at` to `car_trims` (applied to remote D1).
- `node scripts/sync-autocoil-prices.mjs --apply` equivalent: 233 rows updated with the current list price shown on auto.co.il, `price_source = 'auto.co.il'`, `price_checked_at = '2026-11-18'`.
  - 135 matched by auto.co.il version id (`auto_co_il_id`), 98 by trim name with the same powertrain.
  - 130 of the 233 had a hand-entered price before; trim-name matches were a median 11.6% off.
- Not touched: 2,129 rows (old estimates or no price). No rows inserted or deleted.

Rollback: `npx wrangler d1 execute car-issues-db --remote --file docs/data-changes/2026-11-18-autocoil-prices-rollback.sql`
(restores the previous `price_ils` and clears `price_source` / `price_checked_at` for exactly these 233 rows).
