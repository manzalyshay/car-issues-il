/**
 * Export all data from Supabase → D1-compatible SQL file.
 * Run once when Supabase is online:
 *   node scripts/export-to-d1.mjs > migrations/0002_seed_data.sql
 *
 * Then apply to D1 via Cloudflare dashboard SQL editor or:
 *   wrangler d1 execute car-issues-db --file=migrations/0002_seed_data.sql --remote
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://smzqfyqhiqwisvbsvchx.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

function esc(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (Array.isArray(v) || typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function fetchAll(table, order = 'id') {
  const all = [];
  let from = 0;
  while (true) {
    const { data, error } = await sb.from(table).select('*').order(order).range(from, from + 999);
    if (error) { console.error(`Error fetching ${table}:`, error.message); break; }
    if (!data?.length) break;
    all.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

async function main() {
  console.error('Fetching data from Supabase...');

  const [makes, models, reviews, expertReviews, likes, profiles] = await Promise.all([
    fetchAll('car_makes', 'sort_order'),
    fetchAll('car_models', 'sort_order'),
    fetchAll('reviews', 'created_at'),
    fetchAll('expert_reviews', 'scraped_at'),
    fetchAll('review_likes', 'review_id'),
    fetchAll('profiles', 'id'),
  ]);

  console.error(`Makes: ${makes.length}, Models: ${models.length}, Reviews: ${reviews.length}, Expert: ${expertReviews.length}`);

  const lines = [
    '-- Auto-generated seed data from Supabase export',
    '-- Apply: wrangler d1 execute car-issues-db --file=migrations/0002_seed_data.sql --remote',
    '',
  ];

  // car_makes
  if (makes.length) {
    lines.push('-- car_makes');
    for (const m of makes) {
      lines.push(
        `INSERT OR REPLACE INTO car_makes (slug, name_he, name_en, country, logo_url, is_popular, sort_order) VALUES ` +
        `(${esc(m.slug)}, ${esc(m.name_he)}, ${esc(m.name_en)}, ${esc(m.country)}, ${esc(m.logo_url)}, ${m.is_popular ? 1 : 0}, ${esc(m.sort_order)});`
      );
    }
    lines.push('');
  }

  // car_models
  if (models.length) {
    lines.push('-- car_models');
    for (const m of models) {
      lines.push(
        `INSERT OR REPLACE INTO car_models (slug, make_slug, name_he, name_en, years, category, trims, sort_order) VALUES ` +
        `(${esc(m.slug)}, ${esc(m.make_slug)}, ${esc(m.name_he)}, ${esc(m.name_en)}, ${esc(m.years)}, ${esc(m.category)}, ${esc(m.trims)}, ${esc(m.sort_order)});`
      );
    }
    lines.push('');
  }

  // reviews
  if (reviews.length) {
    lines.push('-- reviews');
    for (const r of reviews) {
      lines.push(
        `INSERT OR REPLACE INTO reviews (id, make_slug, model_slug, year, rating, title, body, title_en, body_en, category, sub_model, mileage, author, user_id, helpful, dislikes, images, created_at) VALUES ` +
        `(${esc(r.id)}, ${esc(r.make_slug)}, ${esc(r.model_slug)}, ${esc(r.year)}, ${esc(r.rating)}, ${esc(r.title)}, ${esc(r.body)}, ${esc(r.title_en)}, ${esc(r.body_en)}, ${esc(r.category)}, ${esc(r.sub_model)}, ${esc(r.mileage)}, ${esc(r.author)}, ${esc(r.user_id)}, ${esc(r.helpful)}, ${esc(r.dislikes)}, ${esc(r.images)}, ${esc(r.created_at)});`
      );
    }
    lines.push('');
  }

  // expert_reviews
  if (expertReviews.length) {
    lines.push('-- expert_reviews');
    for (const e of expertReviews) {
      lines.push(
        `INSERT OR REPLACE INTO expert_reviews (id, make_slug, model_slug, year, source_name, source_url, original_title, summary_he, local_summary_he, global_summary_he, local_score, global_score, top_score, pros, cons, local_post_count, global_post_count, sources_breakdown, scraped_at) VALUES ` +
        `(${esc(e.id)}, ${esc(e.make_slug)}, ${esc(e.model_slug)}, ${esc(e.year)}, ${esc(e.source_name)}, ${esc(e.source_url)}, ${esc(e.original_title)}, ${esc(e.summary_he)}, ${esc(e.local_summary_he)}, ${esc(e.global_summary_he)}, ${esc(e.local_score)}, ${esc(e.global_score)}, ${esc(e.top_score)}, ${esc(e.pros)}, ${esc(e.cons)}, ${esc(e.local_post_count)}, ${esc(e.global_post_count)}, ${esc(e.sources_breakdown)}, ${esc(e.scraped_at)});`
      );
    }
    lines.push('');
  }

  // review_likes
  if (likes.length) {
    lines.push('-- review_likes');
    for (const l of likes) {
      lines.push(
        `INSERT OR IGNORE INTO review_likes (review_id, user_id) VALUES (${esc(l.review_id)}, ${esc(l.user_id)});`
      );
    }
    lines.push('');
  }

  // profiles
  if (profiles.length) {
    lines.push('-- profiles');
    for (const p of profiles) {
      lines.push(
        `INSERT OR REPLACE INTO profiles (id, email, is_admin) VALUES (${esc(p.id)}, ${esc(p.email)}, ${p.is_admin ? 1 : 0});`
      );
    }
    lines.push('');
  }

  console.log(lines.join('\n'));
  console.error('Done. Pipe output to migrations/0002_seed_data.sql');
}

main().catch(console.error);
