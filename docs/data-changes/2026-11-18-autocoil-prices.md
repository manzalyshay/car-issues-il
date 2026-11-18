# 2026-11-18: car_trims prices from auto.co.il

- Migration `migrations/0019_trim_price_source.sql` added `price_source` and `price_checked_at` to `car_trims` (applied to remote D1).
- `node scripts/sync-autocoil-prices.mjs --apply` equivalent: 233 rows updated with the current list price shown on auto.co.il, `price_source = 'auto.co.il'`, `price_checked_at = '2026-11-18'`.
  - 135 matched by auto.co.il version id (`auto_co_il_id`), 98 by trim name with the same powertrain.
  - 130 of the 233 had a hand-entered price before; trim-name matches were a median 11.6% off.
- Not touched: 2,129 rows (old estimates or no price). No rows inserted or deleted.

Rollback: `npx wrangler d1 execute car-issues-db --remote --file docs/data-changes/2026-11-18-autocoil-prices-rollback.sql`
(restores the previous `price_ils` and clears `price_source` / `price_checked_at` for exactly these 233 rows).

## Same day: Ministry of Transport importer prices

- `scripts/sync-gov-prices.mjs` (data.gov.il "יבואנים ומחירוני רכב חדש" joined to the WLTP model list on model code): 253 rows updated, `price_source = 'gov-importer'`. 112 of them replaced a hand-entered estimate. 24 outliers rejected; rows priced from auto.co.il were skipped.
- Rollback: `npx wrangler d1 execute car-issues-db --remote --file docs/data-changes/2026-11-18-gov-prices-rollback.sql`

## Site change: estimates hidden

From this commit the site only shows a trim price that has a `price_source` (see `VERIFIED_PRICE_SQL` in `src/lib/trimSpecsDb.ts`). After both syncs: 486 sourced prices across 129 models; 542 hand-entered estimates (191 models) stay in `price_ils` but are no longer shown; 139 models show no price until they are mapped to a source.
