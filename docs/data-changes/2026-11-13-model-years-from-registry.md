# Model years for 52 models, from the Ministry of Transport registry

**Date:** 2026-11-13 · **Table:** `car_models.years` · **Rows changed:** 52 (were `[]`)

## Why
56 models had no years (`[]`). Without years there are no year pages for them and the
recall list cannot be limited to the years the site covers.

## Source and rule
- `scripts/il-fleet/fleet.py` now also writes `years.json`: active vehicles per model and
  production year (`shnat_yitzur`) from data.gov.il resource `5e87a7a1-2f6f-41c1-8aec-7216d52a6cf6`.
- A year counts when it has at least 1% of the model's cars on the road (minimum 20 cars).
- Site years = the continuous range between the first and last such year, from 2013 on.

## Left empty (4)
daihatsu/sirion, daihatsu/terios, hyundai/getz, nissan/tiida: every car on the road was built
before 2013 (2002–2011), so no year from 2013 on applies.

## Files
- `2026-11-13-model-years-from-registry.sql`: the values written (the statement run used
  `WHERE years = '[]'` only, which touches the same rows).
- `2026-11-13-model-years-from-registry-rollback.sql`: sets the 52 models back to `[]`.
