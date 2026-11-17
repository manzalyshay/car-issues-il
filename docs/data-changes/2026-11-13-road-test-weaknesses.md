# Road-test weaknesses for 19 models (model_synthesis)

**Date:** 2026-11-13 · **Table:** `model_synthesis` · **Rows added:** 22 (ids 5–26), 60 findings

## What
The problems tab lists "weaknesses found in road tests", each credited to its article.
Only Hyundai Tucson and Omoda FX had rows. This adds the 19 most-searched models that
have published tests with a cons list:

alfa-romeo/stelvio, honda/civic, hyundai/i20, kia/picanto, kia/seltos, kia/stonic,
mazda/mazda3, mg/mg4, mitsubishi/asx, mitsubishi/eclipse-cross, renault/arkana,
seat/arona, seat/ateca, skoda/enyaq, suzuki/swift, toyota/chr, toyota/corolla-cross,
toyota/yaris-cross, volkswagen/id4.

renault/clio was in the top 20 but neither of its two articles has a cons list, so it was skipped.

## How
- Source articles: the URLs already stored in `pro_review_scores.sources` (the "i" popup).
- `text_en` is the article's own cons line (compound lines split into single points);
  `text_he` is a translation of it. Nothing was added that the article does not say.
- Left out: price and value remarks, styling taste, and line-up remarks ("only one engine",
  "no manual gearbox").
- `strengths` is `[]` for these rows (not collected).
- The exact statement that ran is in `2026-11-13-road-test-weaknesses.sql`.

## Rollback
```sql
DELETE FROM model_synthesis WHERE id BETWEEN 5 AND 26;
```
