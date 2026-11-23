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
