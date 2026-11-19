# Model hubs + /cars/compare: baseline to watch (2026-11-19)

Change: model hubs get a "popular comparisons" block ranked by real GSC clicks; Hebrew hub
titles carry the English model name; `/cars/compare` groups lead with the most-clicked pairs
and has a shorter, structured intro. The comparison pages' links back to the model pages were
left as they are ("לדף הדגם ←") - a design choice, so they still pass weight but no anchor text.
Source data: `src/data/top-compare-pairs.ts` (GSC, 90 days to 2026-11-14).

## Baseline (sc-domain:carissues.co.il, 90 days to 2026-11-14)

| Page group | Clicks | Impressions | Avg position |
|---|---|---|---|
| Comparison pages `/cars/compare/<a>/<b>` | 2,126 of 3,797 site clicks (56%) | - | ~6.9 |
| Model hubs `/cars/<make>/<model>` | 31 | 1,843 | ~40 |
| `/cars/hyundai/i20` | - | 504 | 42 |
| `/cars/mazda/mazda3` | - | 342 | 44 |
| `/cars/kia/stonic` | - | 313 | 44 |
| `/cars/compare` | 1 | 1,024 | 38 |

Re-pull on 2026-11-19 (Metrifyr, same window, different page filters) for reference:
compare pages 2,890 clicks / 74,993 impressions / position 6.73; i20 4 clicks,
Mazda3 2, Stonic 2; `/cars/compare` top query "השוואת רכבים" 260 impressions, position 33.

## What to watch (re-check from ~2026-12-20, 28-day windows)

- Model-hub average position (target: under 30) and clicks on the three example hubs.
- Hub queries are bare model names in Hebrew and English ("מאזדה 3", "mazda 3",
  "hyundai i20", "kia stonic"); CTR on these should rise with the new titles.
- `/cars/compare` position for "השוואת רכבים" / "השוואה בין רכבים".
- Comparison pages should hold ~6.9; a drop would mean the extra outbound links hurt them.

## Not addressed here

`keyword_cannibalization` shows model-name queries split between the hub, `/<year>` pages
and `/trim/<slug>` pages (e.g. "טויוטה יאריס קרוס": hub 51%, trim page 36%; "chery tiggo 8 pro":
hub 63%, 2025 page 36%). Comparison pages rarely compete with hubs. Year/trim canonical or
title changes are a separate decision.
