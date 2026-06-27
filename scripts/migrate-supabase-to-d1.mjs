#!/usr/bin/env node
/**
 * Migrate all data from Supabase to Cloudflare D1.
 * Usage: node scripts/migrate-supabase-to-d1.mjs
 */

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
const D1_DB_ID = process.env.D1_DATABASE_ID;

const D1_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/d1/database/${D1_DB_ID}`;

// ── Supabase fetch with pagination ────────────────────────────────────────────

async function fetchAll(table, select = '*') {
  const rows = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const res = await fetch(
      `${SB_URL}/rest/v1/${table}?select=${select}&limit=${limit}&offset=${offset}`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
    );
    if (!res.ok) {
      console.warn(`  [WARN] ${table} fetch failed: ${res.status} ${await res.text()}`);
      return rows;
    }
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    rows.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
  }
  return rows;
}

// ── D1 query executor ─────────────────────────────────────────────────────────

async function d1Query(sql, params = []) {
  const res = await fetch(`${D1_URL}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CF_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(JSON.stringify(data.errors));
  return data;
}

// Insert rows in batches using individual queries (D1 REST doesn't support multi-row VALUES)
async function insertRows(table, rows, buildSql) {
  let inserted = 0;
  let errors = 0;
  for (const row of rows) {
    try {
      const { sql, params } = buildSql(row);
      await d1Query(sql, params);
      inserted++;
    } catch (e) {
      errors++;
      if (errors <= 3) console.warn(`  [ERR] ${table}: ${e.message?.slice(0, 120)}`);
    }
  }
  console.log(`  ✓ ${table}: ${inserted} inserted, ${errors} errors`);
}

// ── Table migrations ──────────────────────────────────────────────────────────

async function migrateMakes() {
  const rows = await fetchAll('car_makes');
  console.log(`car_makes: ${rows.length} rows`);
  await insertRows('car_makes', rows, (r) => ({
    sql: `INSERT OR REPLACE INTO car_makes (slug, name_he, name_en, country, logo_url, is_popular, sort_order) VALUES (?,?,?,?,?,?,?)`,
    params: [r.slug, r.name_he, r.name_en, r.country ?? '', r.logo_url ?? '', r.is_popular ? 1 : 0, r.sort_order ?? 0],
  }));
}

async function migrateModels() {
  const rows = await fetchAll('car_models');
  console.log(`car_models: ${rows.length} rows`);
  await insertRows('car_models', rows, (r) => ({
    sql: `INSERT OR REPLACE INTO car_models (slug, make_slug, name_he, name_en, years, category, trims, sort_order) VALUES (?,?,?,?,?,?,?,?)`,
    params: [r.slug, r.make_slug, r.name_he, r.name_en, typeof r.years === 'string' ? r.years : JSON.stringify(r.years ?? []), r.category ?? 'sedan', typeof r.trims === 'string' ? r.trims : JSON.stringify(r.trims ?? []), r.sort_order ?? 0],
  }));
}

async function migrateReviews() {
  const rows = await fetchAll('reviews');
  console.log(`reviews: ${rows.length} rows`);
  await insertRows('reviews', rows, (r) => ({
    sql: `INSERT OR REPLACE INTO reviews (id, make_slug, model_slug, year, rating, title, body, title_en, body_en, category, sub_model, mileage, author, user_id, helpful, dislikes, images, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    params: [r.id, r.make_slug, r.model_slug, r.year, r.rating, r.title ?? '', r.body ?? '', r.title_en ?? null, r.body_en ?? null, r.category ?? 'general', r.sub_model ?? null, r.mileage ?? null, r.author ?? '', r.user_id ?? null, r.helpful ?? 0, r.dislikes ?? 0, typeof r.images === 'string' ? r.images : JSON.stringify(r.images ?? []), r.created_at ?? new Date().toISOString()],
  }));
}

async function migrateExpertReviews() {
  const rows = await fetchAll('expert_reviews');
  console.log(`expert_reviews: ${rows.length} rows`);
  await insertRows('expert_reviews', rows, (r) => ({
    sql: `INSERT OR REPLACE INTO expert_reviews (id, make_slug, model_slug, year, source_name, source_url, original_title, summary_he, local_summary_he, global_summary_he, local_score, global_score, top_score, pros, cons, local_post_count, global_post_count, sources_breakdown, scraped_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    params: [r.id, r.make_slug, r.model_slug, r.year ?? null, r.source_name ?? '', r.source_url ?? '', r.original_title ?? '', r.summary_he ?? '', r.local_summary_he ?? null, r.global_summary_he ?? null, r.local_score ?? null, r.global_score ?? null, r.top_score ?? null, typeof r.pros === 'string' ? r.pros : JSON.stringify(r.pros ?? []), typeof r.cons === 'string' ? r.cons : JSON.stringify(r.cons ?? []), r.local_post_count ?? 0, r.global_post_count ?? 0, typeof r.sources_breakdown === 'string' ? r.sources_breakdown : JSON.stringify(r.sources_breakdown ?? []), r.scraped_at ?? new Date().toISOString()],
  }));
}

async function migrateProfiles() {
  const rows = await fetchAll('profiles');
  console.log(`profiles: ${rows.length} rows`);
  await insertRows('profiles', rows, (r) => ({
    sql: `INSERT OR REPLACE INTO profiles (id, email, is_admin) VALUES (?,?,?)`,
    params: [r.id, r.email ?? null, r.is_admin ? 1 : 0],
  }));
}

async function migrateReviewLikes() {
  const rows = await fetchAll('review_likes');
  console.log(`review_likes: ${rows.length} rows`);
  await insertRows('review_likes', rows, (r) => ({
    sql: `INSERT OR REPLACE INTO review_likes (review_id, user_id) VALUES (?,?)`,
    params: [r.review_id, r.user_id],
  }));
}

async function migrateReviewReplies() {
  const rows = await fetchAll('review_replies');
  console.log(`review_replies: ${rows.length} rows`);
  await insertRows('review_replies', rows, (r) => ({
    sql: `INSERT OR REPLACE INTO review_replies (id, review_id, author_name, user_id, body, created_at) VALUES (?,?,?,?,?,?)`,
    params: [r.id, r.review_id, r.author_name ?? '', r.user_id ?? null, r.body ?? '', r.created_at ?? new Date().toISOString()],
  }));
}

async function migrateCarImages() {
  const rows = await fetchAll('car_images');
  console.log(`car_images: ${rows.length} rows`);
  await insertRows('car_images', rows, (r) => ({
    sql: `INSERT OR REPLACE INTO car_images (id, make_slug, model_slug, year, url, thumbnail_url, title, author, license, source, width, height, hidden, hidden_reason, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    params: [r.id, r.make_slug, r.model_slug, r.year ?? null, r.url, r.thumbnail_url ?? null, r.title ?? null, r.author ?? null, r.license ?? null, r.source ?? '', r.width ?? null, r.height ?? null, r.hidden ? 1 : null, r.hidden_reason ?? null, r.created_at ?? new Date().toISOString()],
  }));
}

async function migrateCarVideos() {
  const rows = await fetchAll('car_videos');
  console.log(`car_videos: ${rows.length} rows`);
  await insertRows('car_videos', rows, (r) => ({
    sql: `INSERT OR REPLACE INTO car_videos (id, make_slug, model_slug, youtube_id, title, channel, published_at, thumbnail_url) VALUES (?,?,?,?,?,?,?,?)`,
    params: [r.id, r.make_slug, r.model_slug, r.youtube_id, r.title ?? '', r.channel ?? '', r.published_at ?? '', r.thumbnail_url ?? ''],
  }));
}

async function migrateCar3dModels() {
  const rows = await fetchAll('car_3d_models');
  console.log(`car_3d_models: ${rows.length} rows`);
  await insertRows('car_3d_models', rows, (r) => ({
    sql: `INSERT OR REPLACE INTO car_3d_models (id, make_slug, model_slug, sketchfab_uid, sketchfab_name, sketchfab_author, license, reel_url, hidden) VALUES (?,?,?,?,?,?,?,?,?)`,
    params: [r.id, r.make_slug, r.model_slug, r.sketchfab_uid, r.sketchfab_name ?? '', r.sketchfab_author ?? '', r.license ?? null, r.reel_url ?? null, r.hidden ? 1 : null],
  }));
}

async function migrateRecallsCache() {
  const rows = await fetchAll('recalls_cache');
  console.log(`recalls_cache: ${rows.length} rows`);
  await insertRows('recalls_cache', rows, (r) => ({
    sql: `INSERT OR REPLACE INTO recalls_cache (id, make, model, date, component_he, summary_he, consequence_he, remedy_he, manufacturer, recall_year) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    params: [r.id, r.make ?? '', r.model ?? '', r.date ?? '', r.component_he ?? '', r.summary_he ?? '', r.consequence_he ?? '', r.remedy_he ?? '', r.manufacturer ?? '', r.recall_year ?? null],
  }));
}

async function migrateRepairCosts() {
  const rows = await fetchAll('repair_costs');
  console.log(`repair_costs: ${rows.length} rows`);
  await insertRows('repair_costs', rows, (r) => ({
    sql: `INSERT OR REPLACE INTO repair_costs (id, repair_key, repair_name_he, category, applies_to, cost_min_ils, cost_max_ils, cost_avg_ils, notes) VALUES (?,?,?,?,?,?,?,?,?)`,
    params: [r.id, r.repair_key, r.repair_name_he ?? '', r.category ?? 'general', r.applies_to ?? 'all', r.cost_min_ils ?? null, r.cost_max_ils ?? null, r.cost_avg_ils ?? null, r.notes ?? null],
  }));
}

async function migrateUserRepairCosts() {
  const rows = await fetchAll('user_repair_costs');
  console.log(`user_repair_costs: ${rows.length} rows`);
  await insertRows('user_repair_costs', rows, (r) => ({
    sql: `INSERT OR REPLACE INTO user_repair_costs (id, make_slug, model_slug, year, mileage, repair_key, repair_name_he, cost_ils, workshop_type, notes, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    params: [r.id, r.make_slug, r.model_slug, r.year ?? null, r.mileage ?? null, r.repair_key, r.repair_name_he ?? '', r.cost_ils, r.workshop_type ?? null, r.notes ?? null, r.created_at ?? new Date().toISOString()],
  }));
}

async function migrateCarTrims() {
  const rows = await fetchAll('car_trims');
  console.log(`car_trims: ${rows.length} rows`);
  await insertRows('car_trims', rows, (r) => ({
    sql: `INSERT OR REPLACE INTO car_trims (id, make_slug, model_slug, name, model_year, engine_type, engine_cc, engine_hp, transmission, drive, seats, seat_count, screen_size, features, price_ils, is_israel, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    params: [r.id, r.make_slug, r.model_slug, r.name ?? '', r.model_year ?? null, r.engine_type ?? null, r.engine_cc ?? null, r.engine_hp ?? null, r.transmission ?? null, r.drive ?? null, r.seats ?? null, r.seat_count ?? null, r.screen_size ?? null, typeof r.features === 'string' ? r.features : JSON.stringify(r.features ?? []), r.price_ils ?? null, r.is_israel ? 1 : 0, r.sort_order ?? 0],
  }));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Starting Supabase → D1 migration...\n');

  await migrateMakes();
  await migrateModels();
  await migrateCarTrims();
  await migrateProfiles();
  await migrateReviews();
  await migrateExpertReviews();
  await migrateReviewLikes();
  await migrateReviewReplies();
  await migrateCarImages();
  await migrateCarVideos();
  await migrateCar3dModels();
  await migrateRecallsCache();
  await migrateRepairCosts();
  await migrateUserRepairCosts();

  console.log('\n✅ Migration complete!');
}

main().catch(console.error);
