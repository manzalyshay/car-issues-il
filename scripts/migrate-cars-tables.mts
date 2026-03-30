import 'dotenv/config';

const PAT = process.env.SUPABASE_PAT!;
const PROJECT = 'smzqfyqhiqwisvbsvchx';

async function runQuery(query: string) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  if (data.message) throw new Error(data.message);
  return data;
}

// Create tables
await runQuery(`
  CREATE TABLE IF NOT EXISTS car_makes (
    slug TEXT PRIMARY KEY,
    name_he TEXT NOT NULL,
    name_en TEXT NOT NULL,
    country TEXT NOT NULL,
    logo_url TEXT NOT NULL DEFAULT '',
    is_popular BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`);
console.log('✓ car_makes table');

await runQuery(`
  CREATE TABLE IF NOT EXISTS car_models (
    id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    make_slug TEXT NOT NULL REFERENCES car_makes(slug) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    name_he TEXT NOT NULL,
    name_en TEXT NOT NULL,
    years INTEGER[] NOT NULL DEFAULT '{}',
    category TEXT NOT NULL DEFAULT 'sedan',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(make_slug, slug)
  )
`);
console.log('✓ car_models table');

await runQuery(`
  CREATE TABLE IF NOT EXISTS car_3d_models (
    make_slug TEXT NOT NULL,
    model_slug TEXT NOT NULL,
    sketchfab_uid TEXT NOT NULL,
    sketchfab_name TEXT NOT NULL,
    sketchfab_author TEXT NOT NULL,
    license TEXT NOT NULL DEFAULT 'CC BY 4.0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (make_slug, model_slug)
  )
`);
console.log('✓ car_3d_models table');

console.log('All tables created!');
