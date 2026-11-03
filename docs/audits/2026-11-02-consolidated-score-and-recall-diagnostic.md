# CarIssues: consolidated read-only diagnostic (32 score-gap models + recall/news pipelines)

Instruction followed: "Consolidated read-only audit, Version 1.0 (2026-11-02)". It replaces yS4VK and DeQLZ.

## 0. Scope, versions and read-only confirmation

| Item | Value |
|---|---|
| Check window | 2026-11-02, 20:55–21:25 UTC (22:55–23:25 Asia/Jerusalem, IST UTC+2) |
| Code examined | `main` @ `ab1bb19` ("Vehicle lookup: match Hebrew make names…"). This commit is the one deployed: GitHub Actions "Deploy to Cloudflare Workers" run #77 (id 41416368825) succeeded at 2026-11-02 08:54 UTC with head_sha `ab1bb19` |
| Data | Cloudflare D1 `car-issues-db` (090762ad-…). Read-only `SELECT`s only, every query reported `changes: 0`, `rows_written: 0` |
| Live sources | carissues.co.il (32 model pages + /news), data.gov.il CKAN `datastore_search` (both resources), api.nhtsa.gov `recallsByVehicle`, and five publisher pages |
| Earlier work reused | Found no stored artifacts from yS4VK or DeQLZ in the repo, branches or scratch space. The dated public observations quoted in the instruction are kept as the baseline below. Everything else was re-derived in this pass |
| Not done (by instruction) | No code, data, score, schedule or deploy changes. No jobs were triggered, no backfills or imports run, no paid services used, no blocks bypassed. Only this report file was added, on branch `claude/consolidated-diagnostic-report-kyf3vj` (not `main`, so nothing deploys) |

Secrets: none are reproduced here. `wrangler.toml` already holds a public Supabase anon key. That is out of scope (Supabase is not the source of truth) and it is not repeated here.

---

## 1. Summary of findings by certainty

### Established (directly evidenced)

1. **All 32 headlines reproduce exactly from stored inputs, and all 32 equal the live page today.** The code path is `VerdictCard.tsx` `blendWithTestScore(blendWithOwnerRating(ai_score, avg, n), mean(sets)) .toFixed(1)`, using a fixed 30% weight on the external-test average (§3). None of the 32 values changed between the 10:55 public audit and 21:05 UTC.
2. **The comparison in the earlier audit is partly circular.** The external tests are *inside* the headline (30%). The displayed gap is therefore exactly 0.7 × (ai_score − test average). The underlying difference between the stored `ai_score` and the tests is larger than the public gap: for example SX4 has ai 7.8 vs test 2.0 (a 5.8 difference), Range Rover has ai 4.8 vs 8.9 (−4.1).
3. **`car_models.ai_score` / `ai_confidence` have no recorded provenance.** No code in the repo or its git history writes them. No timestamp, source, prompt or input columns exist. The 2026-10-19 batch JSON (`cars-update/carissues-models-9a6cb272.json`, removed in `8e8953d`) contains no score fields. Who or what wrote them, and when, cannot be recovered from the repo or D1.
4. **Recalls are not an input to the current formula.** The formula consumes only `ai_score`, owner reviews (≥3) and test sets. The caption ("…reliability, common issues, recalls and owner reviews", `aiScore.ts` `AI_SCORE_CAPTION_HE/EN`) describes `ai_score`, whose basis is undocumented. Whether recalls influenced `ai_score` is **untraceable**.
5. **Israeli manufacturer-notice data in D1 equals the official source today:** 3,650 rows, 3,650 unique RECALL_IDs, max 16821, identical per-year counts for 2000–2026 (§5.3).
6. **The Israeli recall list is never shown on model pages.** `RecallsSection` can render `source === 'il'` rows (added in `8e8953d`, 2026-11-01). However `/api/recalls` never returns Israeli rows, so that branch is unreachable. Israeli rows are used only in the FAQ/recall *count* on the model page and in `modelInfo.ts`. There is no ingestion job for `recalls_il` in the repo.
7. **The US (NHTSA) cache is materially incomplete versus live NHTSA** for every model where both exist. Examples: Range Rover 21 stored vs 47 live unique; Model 3 14 vs 36; Kuga/Escape 48 vs 75; Corolla 10 vs 15. Nothing is stored that isn't live (stored ⊂ live), which points to non-ingestion rather than bad data.
8. **Kuga 75 vs 48 is explained** (§5.5): 75 is the chart's live NHTSA query (Kuga→Escape alias, MY2013–2026, unique campaigns). 48 is the stored `recalls_cache` subset under `ford/kuga`. Both are US-Escape figures. Neither is an Israeli count.
9. **The NHTSA date handling swaps day and month.** NHTSA now returns `ReportReceivedDate` as DD/MM/YYYY (live example: `22V859000 19/11/2022`). `formatDate()` in both the cron and `/api/recalls` assumes MM/DD and swaps them. 63 stored rows are provably swapped (e.g. `26V693000` stored `10/21/2026`). Rows with day ≤ 12 are silently wrong. `ORDER BY date DESC` on these strings is not chronological.
10. **The news job runs daily and writes data.** `car_news.created_at` shows exactly 5 new rows at 06:00 UTC on every day from 2026-10-20 to 2026-11-02, plus a manual-looking burst of 20 on 2026-10-21 08:xx. Since 2026-10-21 only Motor1 has been ingested, because the per-run cap of 5 is filled from the Motor1 feed before Car and Driver is reached.

### Probable (strong but indirect)

- **The NHTSA/DVSA daily cron (`/api/cron/refresh-recalls`) is probably not completing.** Evidence:
  - It ingests by `car_models.name_en` for every model and year, so it should have filled e.g. Range Rover 2013–2026 to near the live 47. Only 21 are stored.
  - Zero DVSA rows exist.
  - It requires `CRON_SECRET`. The deploy workflow uploads only `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY` and `RESEND_API_KEY`, so whether `CRON_SECRET` exists as a dashboard secret is unverified.
  - The job does all models × years × AI translation inside one request, which is likely to exceed Worker limits.

  No run logs were available to confirm this (§5.1).

### Unresolved

- The cron's last scheduled attempt, success and failure, with logs, for both jobs. No Workers log access was available, `wrangler.toml` has no `[observability]`, and there is no run-history table.
- How and when `recalls_il` was loaded, and by what process (it is out of repo).
- `ai_score` authorship, inputs and date.
- Whether an Israeli recall *list* was ever live in production. Commit `8e8953d` says uncommitted local work, including "Israeli recalls", was "silently overwritten … on deploy", which implies something was deployed from a local tree at some point. Git cannot confirm what was rendered.
- The public 09:31 "two days ago" news observation. The newest stored `published_at` was 2026-11-01T21:00Z, so "two days ago" is not reproducible from stored data (§5.7).

---

## 2. Shared formula (applies to all 32; per-model exceptions in §3)

Source: `src/components/VerdictCard.tsx` lines 30–44 and 94–97; `src/lib/aiScore.ts` `blendWithOwnerRating`; `src/app/cars/[make]/[model]/page.tsx` lines 134–157; `src/lib/proReviewScoreLabels.ts` `filterScoreSetsForYear`. The test blend was introduced in `db715de` (2026-10-31) and reconciled in `8e8953d` (2026-11-01).

1. `base = car_models.ai_score` (a stored constant, cached in memory for 1 h; the page uses ISR `revalidate = 900`).
2. Owner blend: if ≥3 owner reviews, `w = min(0.4, (n−2)·0.1)` and `base = base·(1−w) + 2·avgRating·w`. **None of the 32 has ≥3 reviews.** Formentor has 1 review (5★), which is not blended. So step 2 is a no-op for all 32.
3. Test sets: read from `pro_review_scores` (not hidden). If `car_models.years` is non-empty, keep only the sets whose `years` range covers `max(years)`. If `years` is `[]`, **no filter is applied** (all sets are used).
4. `testAvg = mean(set.score)`: an **unweighted mean of sets**. It is not weighted by test count `n` or by sources, and it is not chosen by variant. `set.score` is the stored value. It is not recomputed from `sources[].norm`, though all 32 stored set scores equal the mean of their source norms (rounded to 0.1).
5. `headline = 0.7·base + 0.3·testAvg`, displayed with `toFixed(1)`. There is no clamp.
6. Normalisation of external ratings is stored per source (`norm`): x/5 ×2, x/10 as-is.
7. Recalls, recall counts, repair status and population: **not used** anywhere in this computation.

All `pro_review_scores` rows have the same `created_at` of 2026-10-26 17:32:28 (one bulk load of 345 sets for 317 models, 2 hidden). The per-source `evidence` field records which schema `ratingValue` / `datePublished` was read. No loader script exists in the repo.

---

## 3. Complete 32-model matrix

Legend:
- **ai** = stored `ai_score` (confidence).
- **Sets used** = sets that enter the mean after step 3.
- **Arithmetic** is the exact unrounded value.
- **IL recalls** = Israeli manufacturer notices (data.gov.il, fetched 2026-11-02). "site rule" uses the page's matcher (`getIsraeliRecalls`: normalised make + exact DEGEM segment). "gen-overlap" means build dates overlap the external set's years.
- **US** = NHTSA unique campaigns: stored `recalls_cache` / live API (same make/model/years). Incidences (campaign × model-year) are in §5.6.
- **Class** uses the instruction's categories: R-ND = calculation reproducible, basis (`ai_score`) not documented. NA-M = comparison not (fully) applicable because of matching.

The baseline and current headline are identical for all 32 (re-read 2026-11-02 21:05 UTC), so one column is shown.

| # | Model | Head­line | ai | Sets used (score, n, years, source) | Arithmetic | IL recalls: site rule / gen-overlap | US stored/live | Matching caveats | Class |
|---|---|---:|---|---|---|---|---|---|---|
| 1 | Suzuki SX4 | 6.1 | 7.8 (high) | 2.0, n1, 2006-13, Auto Express 1/5 (2012-05-05) | .7·7.8+.3·2.0=6.06 | 1 (11467) / **0**: 11467 build 2014 only; 11673 = SX4 **S-CROSS** 2016 (alt name) | 0/0 (not US-sold) | `years=[]` so page scope is undefined. Test is old SX4; IL 11467 (2014 build) and 11673 (S-Cross) postdate or differ from the tested generation | R-ND + NA-M |
| 2 | Mitsubishi Attrage | 5.9 | 7.4 (med) | 2.5, n1, 2013-24, Car and Driver 2.5/10 | 5.93 | 0 / 0 | 0/0 as "Attrage"; "Mirage G4" 1 live (19V330000), not stored | **Test URL is `/mitsubishi/mirage`, headline "2024 Mitsubishi Mirage" (hatch, rolling hub, dateModified 2026-09-29)**, not the G4 sedan. US market and engine/CVT not mapped to Israeli Attrage | R-ND + NA-M |
| 3 | Land Rover Range Rover | 6.0 | 4.8 (high) | 8.9, n2, 2022-, Carbuyer 4.4/5 (2022) + Autocar 4.5/5 (2025-10-18) | 6.03 | 9 / 4 (14539, 14906, 15047, 16717) | 21/47 | Page 2013-2026 (L405 + L460); tests are L460 only. Earlier claim "official query for RANGE ROVER returned no matches" is **contradicted**: 9 exact DEGEM matches exist | R-ND + NA-M |
| 4 | Mitsubishi Lancer | 6.7 | 7.8 (high) | 4.0, n1, 2007-17, Auto Express 2/5 (2012) | 6.66 | 16 / 15 (+3 "LANCER SADAN/SPORTBACK" alt) | 0/0 | `years=[]`. Many airbag notices (keyword) in overlapping builds | R-ND |
| 5 | Mitsubishi Pajero | 6.7 | 7.8 (high) | 4.0, n1, 2006-21, Auto Express 2/5 "Shogun" (2019) | 6.66 | 11 / 6 (+12120 "PAJERO V90W") | 0/0 (Montero not queried) | UK Shogun = Pajero (name alias) | R-ND |
| 6 | Chevrolet Trax | 7.6 | 6.6 (med) | 10.0, n1, 2024-, Car and Driver 10/10 (rolling hub, "2027 Trax") | 7.62 | 3 / 2 (15141, 16813) | 3/6 | `years=[]`. US hub rating moves with the current model year | R-ND |
| 7 | Hyundai ix35 | 6.4 | 7.4 (high) | 4.0, n1, 2010-15, Auto Express 2/5 (2018) | 6.38 | 5 / 5 | 0/0 (US = Tucson; not queried) | `years=[]` | R-ND |
| 8 | Range Rover Sport | 6.6 | 5.6 (high) | 8.9, n2, 2022-, Carbuyer + Autocar | 6.59 | 7 / 3 (14539, 14906, 15047) | 25/47 (1 stored not in live window) | Page 2013-2026 vs tests 2022+ | R-ND + NA-M |
| 9 | Chevrolet Tahoe | 7.8 | 6.8 (med) | 10.0, n1, **2026-2027**, Car and Driver 10/10 (rolling "2027 Tahoe") | 7.76 | 20 / **0** (all builds ≤2024) | 38/41 | Test covers only MY2026-27; page 2015-2026 | R-ND + NA-M |
| 10 | Lamborghini Revuelto | 6.8 | 5.8 (**low**) | 9.0, n1, 2024-, Autocar 4.5/5 | 6.76 | 0 / 0 (no Lamborghini rows in dataset) | 4/4 | — | R-ND |
| 11 | VW Jetta | 6.2 | 7.2 (high) | 4.0, n1, 2011-17, Auto Express 2/5 (2017) | 6.24 | 4 / 4 | 13/26 (10 yrs default) | `years=[]` | R-ND |
| 12 | Audi Q7 | 6.6 | 5.8 (high) | 8.6, n1, 2015-, Carbuyer 4.3/5 (2015-04-09) | 6.64 | 9 / 5 (+16272 "Q7 PHEV") | 10/27 | Single 2015 review applied to 2015-2026 incl. facelifts | R-ND |
| 13 | Land Rover Defender | 6.9 | 6.0 (med) | 8.9, n2, 2020-, Carbuyer + Autocar | 6.87 | 6 / 6 (+13918 "DEFENDER 90") | 11/19 | — | R-ND |
| 14 | Land Rover Discovery | 6.2 | 5.4 (high) | 8.2, n2, 2017-, Carbuyer 4.2 + Autocar 4/5 | 6.24 | 8 / 7 | 13/17 | Multi-model DEGEM rows (shared campaigns) | R-ND |
| 15 | Mercedes EQS | 7.0 | 6.2 (med) | 9.0, n1, 2021-, Carbuyer 4.5/5 | 7.04 | 3 / 3 (+4 "EQS SUV"/"EQS297" alt) | 0/0 ("Mercedes-Benz/EQS" returns nothing; NHTSA naming unverified) | Saloon vs EQS SUV mixed in IL DEGEM | R-ND |
| 16 | BMW iX | 7.1 | 6.4 (med) | 8.9, n2, 2021-, Carbuyer 4.4 + Autocar 4.5 | 7.15 | 15 / 15 | 3/12 | IX1/IX3 rows are excluded correctly by the exact rule | R-ND |
| 17 | Honda Accord | 7.8 | 8.6 (high) | 6.0, n1, 2013-17, Auto Express 3/5 (2016) | 7.82 | 28 / 7 (airbag-keyword heavy) | 3/15 | `years=[]`. Stored generation label "ninth generation (UK)" for 2013-17 needs checking (UK/EU Accord ≠ US 9th gen) | R-ND + NA-M |
| 18 | Range Rover Velar | 6.0 | 5.2 (high) | 7.8, n2, 2017-, Carbuyer 3.8 + Autocar 4/5 | 5.98 | 4 / 4 | 3/13 | — | R-ND |
| 19 | Mercedes C-Class | 6.8 | 6.4 (high) | **8.6 n1 2021- (W206, Carbuyer) and 7.0 n1 2023- (C63 S E Performance, icar 7/10)** | mean 7.8; 6.82 | 13 / 9 (+5 alt "C CLASS 206" etc.) | 0/0 (NHTSA naming) | Page 2015-2025 includes W205; both sets cover 2025, so both are kept and **blended equally**: a range assessment and a single AMG-variant test count the same | R-ND + NA-M |
| 20 | Porsche Taycan | 7.0 | 6.2 (high) | 8.8, n2, 2019-, Carbuyer 4.3 (2019) + Autocar 4.5 (2025) | 6.98 | 4 / 4 (13914, 14372, 14438, 15567) | 23/27 | Focus case, see §3.2 | R-ND |
| 21 | Toyota Auris | 7.8 | 8.6 (high) | 6.0, n1, 2012-18, Auto Express 3/5 | 7.82 | 19 / 14 | 0/0 | `years=[]` | R-ND |
| 22 | Toyota Avensis | 7.7 | 8.4 (high) | 6.0, n1, 2009-18, Auto Express 3/5 | 7.68 | 24 / 1 | 0/0 | `years=[]`. Most IL rows are pre-2009 builds | R-ND |
| 23 | Toyota Verso | 7.7 | 8.4 (high) | 6.0, n1, 2009-18, Auto Express 3/5 | 7.68 | 5 / 4 (+Avensis Verso / Space Verso alt) | 0/0 | `years=[]`. Verso vs Avensis Verso vs Yaris Verso naming | R-ND |
| 24 | Hyundai Ioniq 5 | 7.4 | 6.8 (high) | **8.5 n2 2024- (facelift; Independent 9 + Top Gear 8) and 9.0 n1 2024- (Ioniq 5 N, icar)**; 9.0 n1 2021-23 (pre-facelift, Electrifying) **excluded** | mean 8.75; 7.385 | 3 / 3 | 11/15 | Equal weight to range set (n=2) and N-variant (n=1). Pre-facelift set dropped by the max(years)=2026 filter although the page covers 2021-23 | R-ND + NA-M |
| 25 | Discovery Sport | 5.9 | 5.2 (high) | 7.5, n2, 2015-, Carbuyer 4/5 (2015) + Autocar 3.5/5 (2025) | 5.89 | 11 / 10 | 12/15 | — | R-ND |
| 26 | Toyota Aygo (page "Aygo X") | 8.0 | 8.6 (high) | **7.0 n1 2021- (Aygo X, Autocar) and 6.4 n1 2014-21 (Aygo Mk2, Carbuyer)** | mean 6.7; 8.03 | 1 (14589, "AYGO X") / 1; 3 older "AYGO" rows unmatched | 0/0 | `years=[]`, so **no filter**: the previous-generation Aygo set is blended into an Aygo X page | R-ND + NA-M |
| 27 | Chevrolet Colorado | 7.5 | 6.8 (med) | 9.0, n1, 2023-, Car and Driver 9/10 (rolling "2027") | 7.46 | 0 / 0 | 17/18 | US-market pickup; IL market fit unverified | R-ND |
| 28 | Cupra Formentor | 7.5 | 7.0 (med) | **8.2 n2 2020- (Carbuyer 4.2 + Autocar 4/5) and 9.0 n1 2025- (VZ Performance, icar)** | mean 8.6; 7.48 | 0 / 0. Under make **SEAT**: 14325, 15069 ("CUPRA FORMENTOR") | 0/0 (not US-sold) | Equal-weight variant set. Make-mapping gap: Israeli notices are filed under SEAT | R-ND + NA-M |
| 29 | Jeep Avenger | 6.9 | 6.2 (med) | 8.4, n1, 2022-, Carbuyer 4.2/5 | 6.86 | 3 / 3 (+16020 "AVENGER BEV", 16568 "AVENGER MHEV") | 0/0 (not US-sold) | Powertrain-suffixed DEGEM rows are missed by the exact rule | R-ND |
| 30 | Range Rover Evoque | 5.9 | 5.2 (high) | 7.4, n2, 2019-, Carbuyer 3.9 + Autocar 3.5 | 5.86 | **0** / 0. Alt names "NEW RANGE ROVER EVOQUE (LZ/JZ)", "EVOQUE": 12700, 13610, 13857, 13898, 16201, 16420 overlap | 17/27 | Page shows no Israeli matches although ≥6 generation-relevant notices exist | R-ND + NA-M |
| 31 | Mercedes GLS | 7.1 | 6.4 (med) | 8.6, n1, 2019-, Carbuyer 4.3/5 | 7.06 | 8 / 8 (+9 "GLE/GLS" alt rows) | 0/0 (NHTSA naming) | "GLE/GLS" combined segments are missed by the exact rule | R-ND |
| 32 | Xpeng G6 | 6.9 | 6.2 (**low**) | 8.4, n4, 2024-: icar 9/10, CAR 4/5 (no date), Carbuyer 4.2/5, carwow 8/10 | 6.86 | 0 / 0 (no Xpeng rows) | 0/0 | — | R-ND |

None of the 32 classes as "cannot be reproduced": every value matched to 0.1. None has a documented basis for `ai_score`. The recall columns are risk context only. They do not validate or invalidate any headline, and no recall penalty or denominator is implied.

### 3.1 Recall *keyword* triage of generation-overlapping Israeli notices

This is a first pass over Hebrew defect text (`TEUR_TAKALA`), not a safety classification. "Wheel" (גלגל) can mean steering wheel. A human must read each row before any severity claim.

- **Range Rover:** 14539 seat-belt pretensioner, 15047 headlamp loss, 16717 driver side airbag non-deployment.
- **Taycan:** 13914 sudden drive-power loss, 15567 front brake hose leak (reduced braking).
- **Discovery Sport:** 13610/13857/13898 (same DEGEM, 2019-20 builds, possibly repeated or superseding notices) fire keyword; 14537 airbag.
- **Defender/Discovery/Velar:** 14539 seat belt, 16717 airbag.
- **Lancer/Pajero/Accord:** multiple airbag notices on overlapping builds.
- **EQS:** 16602 thermal keyword.
- **Avenger:** 16188 fuel leak/fire keyword.
- **ix35:** 15730 brakes, 15985 fire keyword.
- **C-Class:** 15124/15424/15559/15580/15617/15661/16571 share the same multi-model DEGEM list and 2021-23 build window. These are possibly one defect re-notified. The source does not state supersession, so this is **unresolved**.

### 3.2 Focus cases

- **Range Rover:** The page spans 2013-2026. The 8.9 set is 2022+ L460 only. Of the 9 site-rule notices, 4 overlap 2022+ builds (14539, 14906, 15047, 16717); the other 5 are older builds. The older-generation totals must not be set against the L460 road tests. US: 47 live unique campaigns across MY2013-26 vs 21 stored.
- **SX4:** The test (Auto Express 1/5, dated 2012-05-05, set 2006-2013) is the old SX4. IL 11467 (DEGEM "SX4,CEOSSOVER") has build window 2014-01-01..2014-12-31, which is outside the tested 2006-2013 set. Its applicability to first-gen SX4 is therefore **doubtful**, and the source does not resolve it. IL 11673 is "SX4 S-CROSS,SWIFT,VITARA", built in 2016: the successor, not the tested car. `years=[]` for this page, so the page itself has no declared generation scope.
- **Taycan:** 13914 (2020 builds; drive power loss), 14372 (2020-22; rear-right ISOFIX access), 14438 (2020-22, incl. Cross Turismo; seat wiring sleeve), 15567 (2020-24; front brake hoses). The build windows are year-granular, so not every Taycan is affected. Facelift (2024+) builds fall only inside 15567's window. US stored 23 vs live 27 (missing incl. 25V415000, 25V896000).

---

## 4. External tests: coverage audit (no imports)

**Stored inventory** (all 345 sets, D1): Carbuyer 210, Autocar 187 + "autocar" 7, icar 57, Top Gear 30 + "topgear" 7, Auto Express 3 + "autoexpress" 28, Car and Driver 22, CAR magazine 18, The Independent 16, Electrifying 14, Autotrader 11, carwow 6, DrivingElectric 6, Business Motoring 3, Exchange and Mart 1. The case and spacing variants (Autocar/autocar, Top Gear/topgear, Auto Express/autoexpress) are **aliases of one publisher**, not independent sources. No What Car?, Parkers, evo or Edmunds URL is stored anywhere.

### 4.1 The five specified candidates (checked 2026-11-02 ~21:15 UTC from public schema.org metadata only; no article text copied)

| Publisher | URL | Verified rating (schema) | Published / modified | Applicability | Stored? | Effect if one day approved (illustration only, not applied) |
|---|---|---|---|---|---|---|
| What Car? | …/land-rover/range-rover/4x4/review/n17353 | **4/5** (8.0) | 2024-01-09 / 2025-05-19 | Page lists 2022-present L460 | No | Third L460 source vs Carbuyer 8.8 + Autocar 9.0 |
| What Car? | …/mercedes-benz/eqs/saloon/review/n24120 | **3/5** (6.0) | 2022-02-03 / 2023-05-31 | EQS **saloon** (matches the page, not EQS SUV) | No | Second source vs Carbuyer 9.0 |
| Parkers | …/suzuki/sx4/review/ | **3.5/5** (7.0) | 2019-06-06 | Title "Used Suzuki SX4 Hatchback (2006 - 2014)", the old SX4 | No | Second source vs Auto Express 2.0 |
| Parkers | …/hyundai/ix35/review/ | **4/5** (8.0) | 2019-06-06 | "Used Hyundai ix35 Estate (2010 - 2015)" | No | Second source vs Auto Express 4.0 |
| evo | …/lamborghini/revuelto | **5/5** (10.0) | 2023-10-04 / 2026-01-28 | Revuelto | No | Second source vs Autocar 9.0 |
| Edmunds | …/mitsubishi/mirage-g4/2024/ | **Not verified**: HTTP 403 (CloudFront block); not bypassed | — | Would also need G4 ↔ Attrage market, engine, transmission and generation mapping | No | — |

**Other 26 models:** no systematic publisher search was done in this pass. The status is "no verified addition found", **not** "none exists". The highest-priority gaps are the 18 single-source sets (SX4, Attrage, Lancer, Pajero, Trax, ix35, Tahoe, Revuelto, Jetta, Q7, EQS, Accord, Auris, Avensis, Verso, Colorado, Avenger, GLS); several of these rest on a single Auto Express score. No Hebrew candidates were checked beyond the already-stored icar sets.

**Dynamic or rolling source URLs:**
- The Car and Driver hub pages (Trax, Tahoe, Colorado, Mirage) are rolling. Each rating applies to the "current reviewed model year", and the stored evidence records dateModified 2026-09/10. A later re-read may show a different model year or rating.
- The Carbuyer and Autocar URLs are evergreen model pages with an old datePublished (e.g. Q7 2015-04-09).
- The CAR magazine G6 source has no date.

**Access and reuse notes (unresolved, not legal advice):**
- robots.txt for parkers.co.uk and evo.co.uk does not disallow review paths. whatcar.com robots.txt was not retrieved. edmunds.com blocks automated access (403).
- Accessible numeric metadata is **not** proof of permission for automated ingestion or display. Publisher terms of use were not reviewed in this pass, and that review is required before any automated collection.

---

## 5. Recall/news daily pipelines

### 5.1 Job matrix

| Job | Exists? | Trigger | Schedule (TZ) | Last scheduled attempt / success / failure | Logs | Writes evidence |
|---|---|---|---|---|---|---|
| NHTSA (+DVSA) US recalls | Yes: `/api/cron/refresh-recalls` | CF Cron → `worker-entry.js` `scheduled()` → internal fetch with `Bearer ${CRON_SECRET}` | `0 3 * * *` **UTC** (05:00 IST, 06:00 IDT) | **Unknown**: no run history or logs accessible | Not available. No observability config and no run table. Route returns JSON only; `scheduled()` discards the response | `recalls_cache` has **no timestamp**. Stored ⊂ live with large gaps (§5.6). 0 DVSA rows. Kuga's 48 rows cannot come from this job: it queries "Kuga" (NHTSA: 0) without the alias. **Probable: not completing** (§1) |
| Israeli manufacturer notices | **No job in repo** | — | — | n/a | n/a | `recalls_il` (migration 0010, `8e8953d`) equals the official source exactly today. It was loaded by an unrecorded out-of-repo process at an unknown time |
| Israeli overdue restrictions (hagbalat_recall) | **Not used** (no reference in code) | — | — | n/a | n/a | Live source: 125,028 rows, fields `MISPAR_RECHEV, RECALL_ID, SUG_RECALL, SUG_TAKALA, TEUR_TAKALA, TAARICH_PTICHA` (no SHNAT_RECALL). Plate-level, out of scope; the proposed lookup is on hold |
| News | Yes: `/api/cron/refresh-news` | Same CF Cron path | `0 6 * * *` UTC | Scheduled writes at 06:00 UTC **every day 2026-10-20 → 2026-11-02** (latest 2026-11-02 06:00:57) | Not available | 5 rows/run (cap `refreshCarNews(5)`); manual burst 2026-10-21 08:xx (20) and 12:xx (5) |

The ~20 most recent log lines requested by the instruction **cannot be supplied** for any job. Cloudflare Worker invocation logs were not reachable from this session. The available Cloudflare tool exposes only the worker name and id, with no tail or logs. No application log table exists.

Deployments do not reset CF Cron Triggers, but they replace the code. Two deploys failed on 2026-11-01 (#73 and #75: a Google Fonts fetch during build) and were followed by successful redeploys. This did not hide any job failure in the data examined.

### 5.2 Israeli recall display: was it ever deployed?

- **In code now:** the data layer is `src/lib/israeliRecallsDb.ts` `getIsraeliRecalls`. It is called by `cars/[make]/[model]/page.tsx:143` (count only, `recallCount` on line 150) and `lib/modelInfo.ts:175` (count only). The UI branch is `RecallsSection.tsx:67,302,310`, which handles `source === 'il'`.
- **Broken link:** `/api/recalls` (the only data source for `RecallsSection`, `RecallsBarChart` and `RecallsBadge`) returns NHTSA or `recalls_cache` rows only and never sets `source: 'il'`. The `Recall.source` comment says "merged … elsewhere", but no such merge exists. The Israeli list branch is therefore **unreachable dead code**. The `/issues` page uses `getRecallsFromCache` only and labels it "US recalls".
- **History:** every Israeli-recall code path first appears in `8e8953d` (2026-11-01 14:48 UTC). That commit message states that local, never-committed work (incl. "Israeli recalls") was overwritten by another session's deploy and then reconstructed. Whether an earlier local-tree deploy actually rendered an Israeli list cannot be established from git or from the data examined.
- **Effect on the dated observations:** Corolla/Kuga/Model 3 show US-labelled lists and charts and no Israeli list. This is consistent with the code, not a regression to presume. The e-tron GT /issues showing no recall section is consistent with 0 stored rows under `audi/e-tron gt` (live NHTSA has 14).
- **Matching limits** in `getIsraeliRecalls` even if wired up: an exact normalised DEGEM segment match misses "NEW RANGE ROVER EVOQUE", "AVENGER BEV", "GLE/GLS", "C CLASS 206", "SX4 S-CROSS" and "KUGA PHEV" (16810). It also misses make-alias filings (Cupra under SEAT).

### 5.3 Israeli manufacturer notices: stored vs official (2026-11-02)

| Measure | Official (CKAN, paginated 1000/page, `success: true`, all `_id` unique) | D1 `recalls_il` |
|---|---|---|
| Rows | 3,650 | 3,650 |
| Unique RECALL_ID | 3,650 | 3,650 |
| Max RECALL_ID | 16821 | 16821 |
| 2026 / 2025 / 2024 / 2023 | 385 / 425 / 316 / 331 (ID ranges 16415-16821 / 15819-16433 / 15216-15902 / 14650-15213) | identical counts and ranges |
| All years 2000-2026 | per-year counts | identical |

Representative rows match on DEGEM, year and build dates: 11467, 11673, 13914, 14372, 14438, 15567, 16197, 16638, 16810, 16814, 16821, 11503, 15765. RECALL_ID ranges overlap between recall years, so SHNAT_RECALL is a recall year, not issuance order. No duplicates were found, and no CKAN filters were applied. Field-by-field equality was checked only on that sample, not on all 3,650 rows.

### 5.4 Kuga battery-recall summary line: provenance

The line "שורת ריקולים עדכנית סביב סוללת המתח הגבוה ונתוני הצריכה" is the stored `expert_reviews.cons` of row `0b9c4aee-…` (`source_name='AI Knowledge'`, `scraped_at 2026-10-18 19:18:13`).

It is identical to `cons_text` for `ford/kuga` in the batch file `cars-update/carissues-models-9a6cb272.json` (generated 2026-10-19, added in `09e80fd`, removed in `8e8953d`). That file states its texts were copied verbatim from batch research summaries. The same record's `recalls_il.text` cites "10 notices… latest (2026): fuel consumption gap, battery-cell failure causing loss of propulsion, HV battery-cell defect", and its sources list data.gov.il and NHTSA (Escape MY2021).

**Conclusion:** the line is generated or edited research text. The research prompt and inputs are **not stored**. IL 16810 (KUGA PHEV, builds 2019-2024, HV battery cells → slowdown/stop message) is **consistent with** the text, but the link is not recorded. US Escape battery campaigns (e.g. 24V954000 traction battery) are also plausible inputs.

### 5.5 Kuga chart 75 vs list/FAQ 48

- **Chart 75:** `RecallsBarChart` calls `/api/recalls?make=Ford&model=Kuga&years=2013..2026`. The `NHTSA_ALIASES` map sends `ford|kuga` to **Ford Escape**, queries NHTSA live per model year and de-duplicates by campaign. Live today: **75 unique campaigns**, 149 campaign×model-year incidences. These are US Escape campaigns. The Escape and Kuga share platforms only for some generations, so this is not a Kuga-specific or Israeli figure.
- **/issues list 48:** `getRecallsFromCache('Ford','Kuga')` returns the stored `recalls_cache` rows under `ford/kuga`: **48**, all contained in the live 75 (27 missing). These rows were written by the on-demand `/api/recalls` caching path (the cron cannot write them).
- **FAQ 48:** `recallCount = recalls_cache rows + Israeli site-rule matches`. For DEGEM exactly "KUGA" the official data has ≥3 rows (11503, 15765, …), so on today's code the FAQ figure should exceed 48. The 2026-11-01 observation that the FAQ said 48 may predate `8e8953d` going live, or the FAQ text may use a different field. This is **unresolved** and needs a fresh page read.
- Neither number is "wrong" for its own denominator. 48 is an incomplete stored subset. 75 is live US Escape unique campaigns across 14 model years.

### 5.6 US data freshness: stored vs live NHTSA (2026-11-02 ~21:10 UTC)

NHTSA returns **HTTP 400 with `{"Count":0,"Message":"Results returned successfully"}`** for valid empty results, so "empty" and "failed" look alike to the cron's `if (!r.ok) return []`. This probe distinguished the two by body. All non-200 responses were this empty-success body.

| Model (NHTSA make/model) | Live unique / incidences | Stored | Live not stored | Newest live stored? |
|---|---|---|---|---|
| Kuga → Escape 2013-26 | 75 / 149 | 48 | 27 | 26V123/301/374: yes |
| Toyota Corolla 2014-26 | 15 / 25 | 10 | 5 (incl. 25V040000) | 26V110000 yes |
| Tesla Model 3 2017-26 | 36 / 139 | 14 | 22 (26V283000, 26V445000 missing) | partial |
| Audi e-tron GT 2022-26 | 14 / 28 | 0 | 14 | no |
| Range Rover 2013-26 | 47 / 101 | 21 | 26 | 26V599000 missing |
| RR Sport | 47 / 92 | 25 | 23 | partial |
| Tahoe | 41 / 66 | 38 | 3 | 26V114000 missing |
| Revuelto | 4 / 6 | 4 | 0 | yes |
| Jetta (10 yrs) | 26 / 35 | 13 | 13 | partial |
| Q7 | 27 / 43 | 10 | 17 | none of newest 3 |
| Defender | 19 / 48 | 11 | 8 | partial |
| Discovery | 17 / 43 | 13 | 4 | partial |
| iX | 12 / 28 | 3 | 9 | none |
| Accord (10 yrs) | 15 / 36 | 3 | 12 | none |
| Velar | 13 / 22 | 3 | 10 | partial |
| Taycan | 27 / 66 | 23 | 4 | partial |
| Ioniq 5 | 15 / 21 | 11 | 4 | yes |
| Discovery Sport | 15 / 23 | 12 | 3 | partial |
| Colorado | 18 / 23 | 17 | 1 | yes |
| Trax (10 yrs) | 6 / 9 | 3 | 3 | 26V539000 missing |
| Evoque | 27 / 42 | 17 | 10 | none |
| Mirage G4 (for Attrage) | 1 / 2 | 0 | 1 | — |
| SX4, Attrage, Lancer, Pajero, ix35, Auris, Avensis, Verso, Aygo X, Formentor, Avenger, G6 | 0 | 0 | — | non-US names. Empty ≠ "no recalls" |
| EQS, C-Class, GLS as "Mercedes-Benz" | 0 | 0 | — | **naming uncertainty**: NHTSA likely lists these under other model strings. Not resolved |

The Corolla 26V110000 (2026) row being stored proves ingestion at *some* time, not healthy daily scheduling. Because `recalls_cache` has no write timestamp, present freshness cannot be dated. The gaps above are consistent with on-demand caching on page visits plus a non-completing cron.

### 5.7 News

| Stage | Evidence |
|---|---|
| Last job attempt / success | 2026-11-02 06:00 UTC run wrote 5 rows (06:00:57). Daily 06:00 writes every day 10-20 → 11-02 |
| Fetched items | Not recorded. `fetchRss` returns `[]` on any HTTP error or exception, so failed fetches are indistinguishable from empty feeds |
| Accepted/filtered | No editorial filter. New = URL-hash not in table. **Cap: first 5 unseen items, Motor1 before Car and Driver** (`carNews.ts` `toProcess.slice(0, maxPerRun)`), so Car and Driver has been starved since 10-21 |
| Stored | 337 rows total, 1 hidden; 46 since 10-25 |
| Displayed | `/news` uses ISR `revalidate = 1800`, order `published_at DESC`, relative time from `published_at` (`NewsGrid.tsx` `timeAgo`) |
| "Two days ago" at 09:31 IST on 11-02 | Newest stored `published_at` = 2026-11-01T21:00Z (~10.5 h earlier), which would display "לפני 10 שעות". **Not reproducible** from stored data. Possible causes: a stale cached render or a different newest item at the time. Unresolved; neither a fetch nor a write failure is evidenced |

### 5.8 Observed silent-failure risks (observations only)

1. Failed fetches are accepted as empty: the NHTSA (`!r.ok → []`, and NHTSA uses 400 for valid empty), DVSA (`catch {}`) and RSS paths (`catch → []`).
2. No run ledger or alerting. `scheduled()` discards the route's response and status. A 401 from a missing `CRON_SECRET` would be invisible.
3. Partial ingestion looks like success: the cron returns `ok: true` with counts only, and writes per row as it goes. A timeout leaves partial data with no marker.
4. No write timestamps on `recalls_cache` or `recalls_il`, so staleness cannot be shown or dated.
5. Day/month swap in `formatDate` (DD/MM NHTSA input), plus 1,392 rows with empty dates and string-sorted dates.
6. Inflation and denominator mixing: the chart counts US alias campaigns (Escape for Kuga). The FAQ adds US cache + Israeli counts into one number without a crosswalk. Multi-model DEGEM rows count once per matching model.
7. The cron uses `car_models.name_en` without `NHTSA_ALIASES` and skips models whose `years` is `[]`. 11 of the 32 have `years = []`.
8. The news cap and ordering silently starve the second feed.

---

## 6. Unresolved evidence and recommended next decisions

**Missing evidence (exact):**
- Cloudflare Worker cron invocation history and logs for `0 3 * * *` and `0 6 * * *` (Workers → Logs/Observability, or `wrangler tail` at 03:00/06:00 UTC).
- Whether `CRON_SECRET` is set on the worker.
- The authoring process, inputs and date for `car_models.ai_score` / `ai_confidence` (all 32).
- The `recalls_il` loader and its run time.
- The `pro_review_scores` loader (2026-10-26 17:32 bulk insert).
- A fresh read of the Kuga FAQ text.
- NHTSA model strings for Mercedes EQS/C-Class/GLS and the Hyundai Tucson-for-ix35 mapping.
- Publisher terms of use for What Car?, Parkers and evo.
- Human severity review of the keyword-flagged recalls.

**Decisions for the owner (no action taken):**
1. **Is circularity intended?** The tests are 30% of the headline, and the headline is also compared against those tests. Decide whether the public comparison should be against `ai_score` or against the blended value.
2. **Set weighting policy:** decide between equal-weight sets (current), weighting by `n`, or selecting by variant. This affects C-Class, Ioniq 5, Aygo and Formentor. Also decide the treatment of `years = []` models (no filter, e.g. Aygo blends the previous generation).
3. **`ai_score` documentation:** require a stored basis (inputs, date, method) before treating any headline as "documented". The caption's mention of recalls is currently unverifiable.
4. **Recall pipeline (proposed sample, for later approval only; not executed):**
   - Pick 3 models (Range Rover, Kuga, Corolla).
   - Show a dry-run diff of live NHTSA vs `recalls_cache` with corrected DD/MM parsing.
   - Add a run ledger row per cron invocation (start, end, status, fetched, written).
   - Review the Israeli-list wiring in `/api/recalls` on one model, using a widened DEGEM matcher whose output is reviewed by hand.
5. **Publisher additions:** if approved after a terms review, a 5-row worked sample (the verified table in §4.1) with before/after headline arithmetic shown, applied manually and not via the pipeline.

*Report generated read-only. No code, data, scores, schedules or deployments were changed.*

---

## Correction (2026-11-03): cause of the US recall gaps

The dry-run diff run on 2026-11-03 for Range Rover, Kuga and Corolla shows that **every campaign NHTSA lists for them is already in `recalls_cache`**. The ones "missing" from those pages are stored under *another* model: Range Rover's under RR Sport, Evoque, Discovery (Sport), Defender and Velar; Kuga's under Focus, Fiesta, Puma and Ranger; Corolla's under Prius, RAV4 and Lexus NX. `recalls_cache.id` is the campaign number, so a campaign covering several models could only be attached to one of them.

| Model | Live unique | Listed on page before | Stored under another model | New to fetch | Date repairs (empty / swapped) |
|---|---:|---:|---:|---:|---:|
| Range Rover | 47 | 21 | 26 | 0 | 37 / 8 |
| Kuga (→ Escape) | 75 | 48 | 27 | 0 | 8 / 19 |
| Corolla | 15 | 10 | 5 | 0 | 12 / 3 |

So findings §1.7 and §5.6 ("cache materially incomplete … non-ingestion") are corrected. The data was ingested, but the one-model-per-campaign storage hid it. The "probable: cron not completing" finding stays unverified: run evidence is still missing, and that is what the new `cron_runs` ledger is for. The fix (link table `recalls_cache_models`) is on branch `claude/consolidated-diagnostic-report-kyf3vj`.
