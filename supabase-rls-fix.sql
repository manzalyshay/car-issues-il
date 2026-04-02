-- ─────────────────────────────────────────────────────────────────────────────
-- CarIssues IL — RLS Security Fix
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. reviews ───────────────────────────────────────────────────────────────
-- Drop the dangerous "update any column" policy; all updates now go via
-- service-role API routes (/api/reviews/[id]/helpful, /dislike, /admin).
drop policy if exists "public helpful update" on reviews;
-- Keep: public read, public insert (open for now — add auth later if needed)


-- ── 2. page_views ────────────────────────────────────────────────────────────
alter table if exists page_views enable row level security;
drop policy if exists "public insert page_views" on page_views;
drop policy if exists "public read page_views"   on page_views;
-- Anyone can record a page view; only service_role can read analytics
create policy "public insert page_views" on page_views
  for insert with check (true);


-- ── 3. review_reports ────────────────────────────────────────────────────────
alter table if exists review_reports enable row level security;
drop policy if exists "public insert review_reports" on review_reports;
-- Anyone can file a report; reading is service_role only
create policy "public insert review_reports" on review_reports
  for insert with check (true);


-- ── 4. review_likes ──────────────────────────────────────────────────────────
alter table if exists review_likes enable row level security;
drop policy if exists "public read review_likes"   on review_likes;
drop policy if exists "public insert review_likes" on review_likes;
drop policy if exists "user delete own like"       on review_likes;
create policy "public read review_likes"   on review_likes for select using (true);
create policy "public insert review_likes" on review_likes for insert with check (true);
create policy "user delete own like"       on review_likes for delete using (auth.uid() = user_id);


-- ── 5. review_dislikes ───────────────────────────────────────────────────────
alter table if exists review_dislikes enable row level security;
drop policy if exists "public read review_dislikes"   on review_dislikes;
drop policy if exists "public insert review_dislikes" on review_dislikes;
drop policy if exists "user delete own dislike"       on review_dislikes;
create policy "public read review_dislikes"   on review_dislikes for select using (true);
create policy "public insert review_dislikes" on review_dislikes for insert with check (true);
create policy "user delete own dislike"       on review_dislikes for delete using (auth.uid() = user_id);


-- ── 6. contact_messages ──────────────────────────────────────────────────────
alter table if exists contact_messages enable row level security;
drop policy if exists "public insert contact_messages" on contact_messages;
-- Anyone can send a contact message; reading is service_role only
create policy "public insert contact_messages" on contact_messages
  for insert with check (true);


-- ── 7. recalls_cache ─────────────────────────────────────────────────────────
alter table if exists recalls_cache enable row level security;
drop policy if exists "public read recalls_cache" on recalls_cache;
create policy "public read recalls_cache" on recalls_cache
  for select using (true);
-- Writes via service_role only


-- ── 8. social_posts ──────────────────────────────────────────────────────────
alter table if exists social_posts enable row level security;
-- No public access; all reads/writes via service_role


-- ── 9. scraped_posts ─────────────────────────────────────────────────────────
alter table if exists scraped_posts enable row level security;
-- No public access; all reads/writes via service_role


-- ── 10. scrape_source_stats ──────────────────────────────────────────────────
alter table if exists scrape_source_stats enable row level security;
-- No public access; all reads/writes via service_role


-- ── 11. car_3d_models ────────────────────────────────────────────────────────
alter table if exists car_3d_models enable row level security;
drop policy if exists "public read car_3d_models" on car_3d_models;
create policy "public read car_3d_models" on car_3d_models
  for select using (true);


-- ── 12. car_makes / car_models ───────────────────────────────────────────────
alter table if exists car_makes enable row level security;
drop policy if exists "public read car_makes" on car_makes;
create policy "public read car_makes" on car_makes
  for select using (true);

alter table if exists car_models enable row level security;
drop policy if exists "public read car_models" on car_models;
create policy "public read car_models" on car_models
  for select using (true);


-- ── Done ─────────────────────────────────────────────────────────────────────
-- Summary of what each table allows anonymously after this migration:
--   reviews           → SELECT (all), INSERT (anyone)
--   page_views        → INSERT only
--   review_reports    → INSERT only
--   review_likes      → SELECT + INSERT + DELETE own
--   review_dislikes   → SELECT + INSERT + DELETE own
--   contact_messages  → INSERT only
--   recalls_cache     → SELECT only
--   expert_reviews    → SELECT only
--   news_cache        → SELECT only
--   profiles          → SELECT own (or admin)
--   social_posts      → none (service_role only)
--   scraped_posts     → none (service_role only)
--   scrape_source_stats → none (service_role only)
--   car_3d_models     → SELECT only
--   car_makes         → SELECT only
--   car_models        → SELECT only
