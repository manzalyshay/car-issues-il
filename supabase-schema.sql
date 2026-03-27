-- CarIssues IL — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query

-- ── Profiles table (extends Supabase Auth users) ───────────────────────────────
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  is_admin   boolean not null default false,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
create policy "users read own profile"   on profiles for select using (auth.uid() = id);
create policy "users update own profile" on profiles for update using (auth.uid() = id);
-- Admins can read all profiles (needed for admin panel)
create policy "admin read all profiles"  on profiles for select using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);
-- Only service_role can set is_admin = true

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── Reviews table ─────────────────────────────────────────────────────────────
create table if not exists reviews (
  id          uuid primary key default gen_random_uuid(),
  make_slug   text not null,
  model_slug  text not null,
  year        integer not null,
  rating      integer not null check (rating between 1 and 5),
  title       text not null,
  body        text not null,
  category    text not null default 'general',
  mileage     integer,
  author      text not null default 'אנונימי',
  helpful     integer not null default 0,
  created_at  timestamptz not null default now()
);

-- Indexes for fast lookups by make/model/year
create index if not exists reviews_make_model_year on reviews (make_slug, model_slug, year);
create index if not exists reviews_make_model on reviews (make_slug, model_slug);
create index if not exists reviews_created_at on reviews (created_at desc);

-- ── News cache table ───────────────────────────────────────────────────────────
create table if not exists news_cache (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  url          text not null unique,
  summary      text not null default '',
  image_url    text not null default '',
  source       text not null,
  category     text not null default 'general',
  published_at timestamptz not null default now(),
  scraped_at   timestamptz not null default now()
);

create index if not exists news_cache_published_at on news_cache (published_at desc);
create index if not exists news_cache_category on news_cache (category);

-- ── Expert (AI) reviews table ─────────────────────────────────────────────────
create table if not exists expert_reviews (
  id                 uuid primary key default gen_random_uuid(),
  make_slug          text not null,
  model_slug         text not null,
  year               integer,                        -- null = general model summary
  source_name        text not null default '',
  source_url         text not null default '',
  original_title     text not null default '',
  summary_he         text not null default '',       -- legacy/fallback combined summary
  local_summary_he   text,                           -- Israeli forums summary
  global_summary_he  text,                           -- International forums summary
  local_score        numeric(4,2),                   -- 1–10 score from Israeli posts
  global_score       numeric(4,2),                   -- 1–10 score from international posts
  top_score          numeric(4,2),                   -- weighted average of both scores
  pros               text[] not null default '{}',
  cons               text[] not null default '{}',
  local_post_count   integer not null default 0,
  global_post_count  integer not null default 0,
  scraped_at         timestamptz not null default now(),
  next_scrape_at     timestamptz,                    -- when this entry is due for a re-scrape (null = ASAP)
  unique (make_slug, model_slug)                     -- one general row per model
);

create index if not exists expert_reviews_make_model on expert_reviews (make_slug, model_slug);
create index if not exists expert_reviews_next_scrape on expert_reviews (next_scrape_at asc nulls first);

-- ── Migration: add next_scrape_at to existing tables ──────────────────────────
-- Run this if the table already exists without the column:
-- alter table expert_reviews add column if not exists next_scrape_at timestamptz;
-- create index if not exists expert_reviews_next_scrape on expert_reviews (next_scrape_at asc nulls first);

alter table expert_reviews enable row level security;
create policy "public read expert_reviews" on expert_reviews for select using (true);
-- Writes only via service_role key (bypasses RLS)

-- ── Enable Row Level Security (open read, authenticated write) ─────────────────
alter table reviews enable row level security;
alter table news_cache enable row level security;

-- Allow anyone to read
create policy "public read reviews"  on reviews   for select using (true);
create policy "public read news"     on news_cache for select using (true);

-- Allow anyone to insert reviews (no auth for POC)
create policy "public insert reviews" on reviews for insert with check (true);

-- Allow helpful increment via update (only the helpful column)
create policy "public helpful update" on reviews for update using (true) with check (true);

-- News only written server-side (via service_role key, bypasses RLS)

-- ── Seed reviews ──────────────────────────────────────────────────────────────
insert into reviews (make_slug, model_slug, year, rating, title, body, category, mileage, author) values
  ('toyota', 'corolla', 2020, 5, 'מכונית מעולה לישראל', 'נסעתי 80,000 ק"מ ללא שום בעיה. חסכונית בדלק ונוחה לנסיעות עירוניות. ממליץ בחום.', 'general', 80000, 'דני כהן'),
  ('hyundai', 'tucson', 2021, 4, 'SUV אמין ומרווח', 'רכב מרווח ומאובזר. הצריכה קצת גבוהה אבל השירות מצוין. בעיה קטנה עם מערכת ה-infotainment.', 'electrical', 45000, 'מיכל לוי'),
  ('kia', 'sportage', 2022, 5, 'הרכב הטוב ביותר שהיה לי', 'עיצוב מדהים, ביצועים מצוינים, אחריות של 7 שנים. מה עוד צריך?', 'general', 30000, 'ירון אברהם'),
  ('mazda', 'cx-5', 2019, 3, 'חלודה בשלדה אחרי 4 שנים', 'הרכב נוח ומהנה לנהיגה אבל גיליתי חלודה בתחתית השלדה. ציפיתי ליותר ממזדה.', 'mechanical', 95000, 'שרה גרין'),
  ('volkswagen', 'golf', 2020, 4, 'גולף — הקלאסיקה שלא מתיישנת', 'תגובת הגה מדויקת, נוחות גבוהה. עלות תחזוקה גבוהה יחסית אבל שווה כל שקל.', 'general', 60000, 'עמית ברק'),
  ('toyota', 'rav4', 2021, 5, 'היברידי מושלם לישראל', 'חוסך לי 30% בדלק לעומת הרכב הקודם. מנוע שקט, אמין, מרווח. חובה לכל משפחה.', 'mechanical', 40000, 'נועה שמיר')
on conflict do nothing;
