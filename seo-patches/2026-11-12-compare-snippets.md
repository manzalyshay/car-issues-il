# SEO: compare pages title/meta lead with starting price and fuel economy

Branch: `seo/2026-11-12-compare-snippets` (apply: `git checkout -b seo/2026-11-12-compare-snippets origin/main && git am seo-patches/2026-11-12-compare-snippets.patch`)

## What changed
- `/cars/compare/<a>/<b>` `generateMetadata` now uses the new `src/lib/compareSnippet.ts`:
  - HE title: `X מול Y: מחיר, צריכה ותקלות (2026)` (EN: `X vs Y: Price, Fuel Economy & Problems (2026)`)
  - Description opens with each car's starting price and best km/L, e.g. `טויוטה קורולה קרוס מ-₪153,000, עד 22.2 ק"מ לליטר; ...`, then "השוואת מחיר בישראל, צריכת דלק, אמינות ותקלות נפוצות לפי בעלי רכב. איזה כדאי לקנות?"
  - Facts come from `getTrimSpecs` + `summarizeTrims` (same car_trims rows the page shows; implausible values dropped; EVs say "חשמלי" instead of a fake km/L). Falls back to generic copy when no data.
  - Removed the star / "ציון AI x/10" tags from the meta description (no ratings in the snippet).
- New `tests/compareSnippet.test.mjs` (npm test: 70/70 pass). `tsc` shows no new errors. `next build` not run (needs CLOUDFLARE_API_TOKEN).
- No changes to robots, canonicals, hreflang, redirects or sitemap.

## Why (Search Console, sc-domain:carissues.co.il)
- Compare pages = 899 of 1,169 site clicks (77%) in 14 Oct–10 Nov.
- Position held (6.59 → 6.82) but CTR fell 3.84% → 3.61%; clicks 1,019 → 899, impressions 26,535 → 24,930.
- A position-~7 result normally earns ~4–6% CTR; the old title ("מי עדיף? השוואה 2026") gave no reason to click.
- Note: this is the same fix as the 8 Nov run, rebuilt against current main because that patch only existed in a past session and never landed.

## Metric to watch
CTR of `/cars/compare/` pages (baseline 3.61% @ pos 6.82, 899 clicks / 24,930 impr per 28 days). Expect movement within 1–2 weeks of deploy (Google re-crawls titles); judge at 14 and 28 days.

## Rollback
Revert the commit; only `generateMetadata` on the compare route changes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
