# 2026-11-05: Israeli vehicle counts from the Ministry of Transport registry

**Why:** `car_models.active_vehicles_il` ("רכבים פעילים בישראל" on model pages, and the order used for
search popularity and the 3D model check) was entered by hand from articles (October 2026). The owner
asked for it to be refreshed for all cars every 3 days.

**Source:** data.gov.il resource `5e87a7a1-2f6f-41c1-8aec-7216d52a6cf6` (active vehicles per make /
model code / year, updated daily): 4,197,188 active vehicles; 3,877,538 matched to the site's 370 models.
Matching: `scripts/il-fleet/fleet.py` with rules in `scripts/il-fleet/aliases.json`.

**Change:** one UPDATE of `active_vehicles_il` for all 370 rows, plus new column
`active_vehicles_il_as_of` (migration 0013), set to 2026-11-05. Most counts moved by under 5%. The
large changes are corrections:
- hyundai/elantra 42,164 -> 70,570 and hyundai/ix35 40,558 -> 12,112: the registry's "I35" (28,367) is the
  Elantra sold as i35 in Israel, and had been counted under ix35.
- mazda/cx5 32,776 -> 50,116 (three registry spellings: CX-5, MAZDA CX-5, CX5).
- byd/sealion6 0 -> 11,418 and byd/seal 16,594 -> 1,421 (the "SEAL U" is the Sealion 6).
- isuzu/d-max 7,528 -> 25,680 (older D-Max registered as "PICK-UP").
- citroen/c4 14,312 -> 4,164 (C4 Picasso / Cactus / C4X are no longer counted as the C4); citroen/c5x 542 -> 0
  (the 542 were the old C5 sedan; the registry has no C5 X).
- mercedes/gle-coupe 31 -> 1,348, lexus/rx 127 -> 3,911, lexus/ux 9 -> 2,946, alfa-romeo/giulietta 0 -> 2,104.

**Rollback:** `docs/data-changes/2026-11-05-il-vehicle-counts-rollback.sql` restores every previous value.

From now on `.github/workflows/il-fleet-counts.yml` refreshes the counts every 3 days (no record file per run;
each run's output is kept as a workflow artifact for 30 days).
