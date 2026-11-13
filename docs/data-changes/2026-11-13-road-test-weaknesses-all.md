# Road-test weaknesses for all remaining models (model_synthesis)

**Date:** 2026-11-13 · **Table:** `model_synthesis` · **Rows added:** 266 (ids 27–292), 583 findings, 254 models

Follows `2026-11-13-road-test-weaknesses.md` (19 models, ids 5–26).

## Coverage after this change
- 275 of 370 models have at least one sourced road-test weakness (651 findings in total).
- 311 models had road-test articles to read; 254 got findings now. The other 57 had no
  cons list in their articles, or only lines that were dropped (price, styling, line-up).
  Example: Toyota RAV4.
- 59 models have no road-test articles at all.

## Method
See `scripts/road-tests/README.md`. 565 articles were downloaded; 820 unique cons lines
were extracted; 511 were kept after review and translated to Hebrew. The English text is the
article's own line (`text_en`), with its site and link.

## Rollback
```sql
DELETE FROM model_synthesis WHERE id BETWEEN 27 AND 292;
```
