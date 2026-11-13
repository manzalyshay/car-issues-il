# Road-test weaknesses (model_synthesis)

How the "חולשות שעלו במבחני דרכים" box on the problems tab was filled on 2026-11-13.

1. `dump_sources.py out.json` (run from the repo root): article links from
   `pro_review_scores.sources` for models with no `model_synthesis` row (read-only D1 query).
2. `fetch_all.py sources.json html_dir`: downloads the articles (Hebrew icar tests are skipped:
   they have no cons list).
3. `extract_all.py sources.json html_dir findings.json missing.txt`: takes each article's own
   "cons" list, one point per line, up to 5 per model generation, spread across sources.
   Lines about price, styling, line-up/availability, brand or tax are dropped automatically.
4. Review: `findings_en_unique.json` holds every unique English line; `translations_he.py`
   maps the index of each line that was kept to its Hebrew text. Lines not in it were dropped
   by hand (page junk, sentence fragments, comparisons naming another car).
5. The rows were written with `npx wrangler d1 execute car-issues-db --remote --file=...`.
