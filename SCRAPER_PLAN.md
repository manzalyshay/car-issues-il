# Scraper Update Plan — Expert Reviews with Rate Limiting

## Goal
Replace AI-knowledge-only rows (local_post_count=0, global_post_count=0) with real scraped
local+global summaries, without hitting API rate limits, in a gradual scheduled way.

---

## Current state
- ~378 rows, ~344 are AI-knowledge-only (no real posts)
- Cron runs hourly at Vercel: `GET /api/cron/scrape`
- Each cron call processes 10 entries per batch, ~1.2s delay between each

---

## Rate-limit sources

| Source         | Limit                    | Notes                          |
|----------------|--------------------------|--------------------------------|
| Gemini 2.5 Flash (free) | 15 RPM, 1M TPM/day | Primary summarizer |
| Mistral Small  | ~5 RPM (free tier)       | Fallback summarizer             |
| Tapuz, icar, drive | No hard limit      | 1-2 req/sec safe               |
| Reddit JSON API | ~60 req/min            | User-Agent required            |
| Edmunds, CarComplaints | ~10 req/min   | Respect crawl-delay            |

---

## Strategy: Gradual scheduled replacement

### Phase 1 — Seed (happening now)
- `seed-knowledge.mjs` fills all ~926 missing year-specific rows with AI knowledge
- Result: every car+year has a review, but no real local/global data yet
- ETA: ~75 minutes from start

### Phase 2 — Cron replaces AI rows with real scraped data
The Vercel cron (`/api/cron/scrape`) runs every hour and processes 10 entries.
Priority order (via `next_scrape_at`):
1. Rows with `next_scrape_at = null` → never properly scraped (highest priority)
2. AI-knowledge rows with `next_scrape_at` set to 7 days → processed within 1 week
3. Recent-year rows (≤3 years) → refreshed every 14 days
4. General model rows → refreshed every 30 days
5. Older year rows (4+ years) → refreshed every 90 days

**Math:** 1,287 total rows ÷ 10/hour = 5.4 days for a full cycle.

### Phase 3 — Ongoing maintenance (automatic)
Once all rows have real scraped data:
- Cron wakes hourly, checks `next_scrape_at ≤ now`
- On typical days only ~15–30 rows are due → cron finishes in 2–3 batches, then idles
- AI-knowledge rows that got no real posts on rescrape keep their 7-day interval
  (keeps trying to find real discussions as they appear over time)

---

## Migration needed first (run in Supabase SQL editor)

```sql
ALTER TABLE expert_reviews ADD COLUMN IF NOT EXISTS next_scrape_at timestamptz;
CREATE INDEX IF NOT EXISTS expert_reviews_next_scrape ON expert_reviews (next_scrape_at ASC NULLS FIRST);
```

After running this, re-enable the commented lines in:
- `src/lib/expertReviews.ts` (2 places: `saveKnowledgeReview` and `scrapeExpertReviews`)
- `scripts/seed-knowledge.mjs` (`saveRow` function)

---

## Rate-limit handling in the cron

The cron already has:
- 1.2s delay between each of the 10 scrape calls in a batch
- Gemini → Mistral fallback in `generateKnowledgeSummary`
- Timeout: 300s (Vercel Pro maxDuration)

Additional safeguards to add (optional hardening):
1. **Retry-after header**: If a scraping source returns 429, skip it for this batch
2. **Source rotation**: Alternate which sources are queried per run to spread load
3. **Priority boost**: If a row gets 0 posts after scraping, set next_scrape_at to 3 days
   instead of 7, so it gets another chance sooner

---

## Manual trigger (for testing or force-refresh)

```bash
# Trigger one cron batch locally
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3001/api/cron/scrape

# Force-rescrape a specific car via the API
curl -X POST http://localhost:3001/api/expert-reviews \
  -H "x-api-key: $SCRAPER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"makeSlug":"toyota","modelSlug":"corolla","year":2022}'
```

---

## After migration — re-enable next_scrape_at

In `src/lib/expertReviews.ts`, uncomment:
```ts
// next_scrape_at: computeNextScrapeAt(year, true),   // in saveKnowledgeReview
// next_scrape_at: computeNextScrapeAt(year, false),  // in scrapeExpertReviews
```

In `scripts/seed-knowledge.mjs`, uncomment:
```js
// next_scrape_at: nextScrapeAt(year),
```
