# 2026-11-04: show the lighter Kia Sportage 3D model

**Why:** The compare and model pages show the newest Sportage entry. That was "2026 Kia Sportage"
(`87c6560c7c4e419f92b0b278cdd2a052`): about 30 MB of geometry and 709k faces, so pages such as
`/cars/compare/kia/sportage/toyota/corolla-cross` loaded slowly. "2023 Kia Sportage GT-Line"
(`b89d15a4b99349d78c06dcc38e79fd60`) has about 10 MB of geometry and is already in the table.
Requested by the owner in the Claude session on 4 Nov 2026.

**Change (one row):**

```sql
UPDATE car_3d_models SET hidden = 1
WHERE make_slug = 'kia' AND model_slug = 'sportage' AND sketchfab_uid = '87c6560c7c4e419f92b0b278cdd2a052';
```

**Before:** `hidden = NULL`, years 2026 onwards (no end year).

**Effect:** Now the newest visible entry is the 2023 GT-Line (2023-2025). The model page, compare pages and 2026
year pages show it, because the picker falls back to the nearest earlier range.

**Rollback:**

```sql
UPDATE car_3d_models SET hidden = NULL
WHERE make_slug = 'kia' AND model_slug = 'sportage' AND sketchfab_uid = '87c6560c7c4e419f92b0b278cdd2a052';
```
