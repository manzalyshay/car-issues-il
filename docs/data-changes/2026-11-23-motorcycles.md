# 2026-11-23: Motorcycles (/motorcycles)

New D1 tables `moto_makes` (15 rows) and `moto_models` (74 rows), created with
`migrations/0020_motorcycles.sql` and filled by `scripts/moto/seed.py` from
`scripts/moto/models.json` plus fleet counts from `scripts/moto/fleet.py`.

- Source of models and counts: Ministry of Transport two-wheeler registry on data.gov.il
  (resource bf9df4e2-d90d-4c0a-a400-19e15af8e95f, 193,913 vehicles). The registry names most
  models by factory code (Honda "NF13", Yamaha "SH14"); codes were matched to models by engine
  size, tyre sizes, VIN prefix and production years. The 74 models cover 118,592 vehicles (61%).
- The registry renamed SYM ("סאן יאנג" -> "אס ווי אמ") and Kymco ("קואנג יאנג" -> "קימקו");
  both names are matched.
- Counts that run low: Yamaha MT-07 / MT-09 only count rows that name the MT, because the
  700/900 platform codes are shared with Tracer and XSR.
- Recalls: each model lists regex patterns on `recalls_il.degem` (`recall_patterns`), e.g.
  Honda "ADV750" = X-ADV, "NSS750" = Forza 750, "CRF1100" = Africa Twin.
- Reviews / follows for a bike are stored in `reviews` / `model_follows` under make key
  `moto-<make>` (src/lib/motoKeys.ts) so car queries never see them.

Not mapped yet (largest groups): SYM XHB3, XEA3, TE30, LJ30W, LY30, FDA12, Honda Italy MF14/MF16,
Talaria TL6000GY, Yamaha RM/RN platform codes. Run `fleet.py` for the full list (unmatched.txt).

Rollback:

```sql
DROP TABLE moto_models;
DROP TABLE moto_makes;
```

## 2026-11-24: photos, 3D models and AI summaries

All stored in the existing car tables under make key `moto-<make>`:

- `car_images`: 224 Wikimedia Commons photos for 57 models (`scripts/moto/images.py`), every one checked by eye on
  contact sheets. Rejected: old generations sharing a name (1960s Vespa Sprint/Primavera, 1970s Kawasaki Z650/Z900,
  1990s Africa Twin, CB600/900 Hornet), other variants (Tracer, Z900RS, Joyride 16, Cruisym 400), police/ambulance
  bikes, group shots, close-ups and parts. `moto_models.leading_image_url` = the main photo.
  Second pass (the Commons API was rate-limiting this machine, so Commons category and search pages were read
  directly): 33 more photos for 13 models (PCX, NMAX, Tricity 125/300, Forza 125, XMAX 125, Joyride, Joymax Z, Movie,
  AK 550, 390 Adventure, X-Evo, CFMOTO 700MT); licences read from each file's Licensing section. PCX and NMAX
  photos include the 160/155 versions, which share the 125's body. 257 photos for 70 of 74 models in all; none on
  Commons for Sur-Ron Ultra Bee, XMAX 400, CFMOTO 450MT and 800MT.
- `car_3d_models`: 15 Sketchfab models (`scripts/moto/models3d.py`), checked by eye; skipped riders, untextured
  scans, parts and anything over ~1.2M faces (X-ADV, 390 Duke and Vespa Sprint candidates were 1.5-2.3M).
- `expert_reviews`: 48 Hebrew AI summaries (year NULL), written from MCN (motorcyclenews.com) expert road tests and
  963 owners' reviews collected by `scripts/moto/mcn.py`; text in `scripts/moto/summaries.json`, loaded by
  `scripts/moto/load_summaries.py`. Each row keeps the MCN source links, owner/expert ratings and per-area scores
  (`model_data_json`). Reviews MCN filed under the wrong bike (e.g. a Transalp on the X-ADV page) are dropped.

Rollback:

```sql
DELETE FROM car_images WHERE make_slug LIKE 'moto-%';
DELETE FROM car_3d_models WHERE make_slug LIKE 'moto-%';
DELETE FROM expert_reviews WHERE make_slug LIKE 'moto-%';
UPDATE moto_models SET leading_image_url = NULL;
```
