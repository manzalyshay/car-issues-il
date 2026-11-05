# 2026-11-05: replace the low-quality Kia Seltos 3D model

**Why:** The model and compare pages showed the newest Seltos entry: "NEW KIA SELTOS 2026"
(`9b883d7199f64214999e82146ae28dd4`, rmihir560). It is a crude, untextured placeholder with
14k faces. Kia Seltos 2024 (`00288c40b8b142038ab5e146ccf23621`, teenlin3) is a detailed model of the
facelifted Seltos (about 12 MB of geometry) and is already in the table. Requested by the owner
in the Claude session on 5 Nov 2026 (`/cars/compare/kia/seltos/kia/sportage`).

**Change (one row):**

```sql
UPDATE car_3d_models SET hidden = 1
WHERE make_slug = 'kia' AND model_slug = 'seltos' AND sketchfab_uid = '9b883d7199f64214999e82146ae28dd4';
```

**Before:** `hidden = NULL`, years 2026 onwards (no end year).

**Effect:** The newest visible entry is now the 2024 model (2024-2025). The model page, compare pages
and 2026 year page show it.

**Rollback:**

```sql
UPDATE car_3d_models SET hidden = NULL
WHERE make_slug = 'kia' AND model_slug = 'seltos' AND sketchfab_uid = '9b883d7199f64214999e82146ae28dd4';
```
