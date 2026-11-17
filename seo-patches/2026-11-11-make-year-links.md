# SEO: link each current model's newest year page from the make page

Branch: seo/2026-11-11-make-year-links (backlog f). Apply: `git checkout -b seo/2026-11-11-make-year-links origin/main && git am seo-patches/2026-11-11-make-year-links.patch`

## What changed
- New `src/components/MakeNewestYearLinks.tsx`: on every make page (`/cars/<make>`, HE + EN), a "דגמי <יצרן> חדשים: מחיר וגרסאות" row of plain links to each current model's newest year page, e.g. "קיה ספורטאז' 2026" → `/cars/kia/sportage/2026`.
- Only models whose newest year is last year or later; only the newest year, which `isModelYearIndexable` always treats as indexable, so no links to noindex pages.
- `src/app/cars/[make]/page.tsx`: 1 import + 1 line, above the model grid.
- No robots, canonical, redirect or sitemap changes.

## Why (Search Console, carissues.co.il, 13 Oct–9 Nov vs 15 Sep–12 Oct)
- Year pages overall: 105 clicks / 7,657 impressions (prev 176 / 13,683), avg pos ~34.
- 2026 year pages: 38 clicks / 1,337 impressions, pos 20.9 (prev 40 / 1,833, pos 21.8).
- Several sit just outside the top 10 with real demand: ford/kuga/2026 pos 11.9 (55 impr), omoda/omoda5/2026 pos 13.0 (52), lynk-co/05/2026 pos 14.8 (31); queries "פורד פומה 2026" pos 10.2, "מיצובישי פאג'רו 2026 מחיר" pos 9.1.
- Until now a year page got internal links only from its own model page; make pages linked to model pages only.

## Checks
- `npm test` 66/66; `tsc` shows no errors in the changed files (22 existing elsewhere); eslint: no new findings.
- Component render-tested: Hebrew/English labels, newest year per model, old models left out, renders nothing when no current models.
- `next build` not run here (needs CLOUDFLARE_API_TOKEN).
- Heads-up: your local working tree also edits `src/app/cars/[make]/page.tsx` near the same spot (intro block). Expect a small, easy conflict.

## Metric to watch
Clicks, impressions and average position of `/cars/*/*/2026` pages (baseline 38 clicks / 1,337 impr / pos 20.9 over 28 days). Expect movement 2–4 weeks after deploy, once make pages are recrawled.

## Rollback
Revert the commit, or delete the `<MakeNewestYearLinks …/>` line in `src/app/cars/[make]/page.tsx`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
