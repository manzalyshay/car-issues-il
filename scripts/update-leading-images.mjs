#!/usr/bin/env node
// Updates leading_image_url on car_models to the most recent available image.
// Usage: node scripts/update-leading-images.mjs

const ACCOUNT_ID = 'da4220321e156152ca7f02ca93059557';
const DB_ID = '090762ad-b029-4883-b827-9376cdee1ed2';
const API_TOKEN = 'cfut_k8gH6SsELikWi1LOuZOVuZM4fPz29z8XdqA2NUKU18d3ebe1';
const RECENT_THRESHOLD = new Date().getFullYear() - 3;

async function d1(sql, params = []) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DB_ID}/query`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, params }),
    }
  );
  const data = await res.json();
  if (!data.success) throw new Error(JSON.stringify(data.errors));
  return data.result[0].results;
}

const models = await d1('SELECT make_slug, slug FROM car_models ORDER BY make_slug, slug');
console.log(`Processing ${models.length} models...`);

let updated = 0;
let skipped = 0;

for (const { make_slug, slug } of models) {
  const recent = await d1(
    'SELECT thumbnail_url FROM car_images WHERE make_slug = ? AND model_slug = ? AND year >= ? AND thumbnail_url IS NOT NULL AND (hidden IS NULL OR hidden != 1) ORDER BY year DESC, created_at ASC LIMIT 1',
    [make_slug, slug, RECENT_THRESHOLD]
  );

  if (recent.length > 0 && recent[0].thumbnail_url) {
    await d1(
      'UPDATE car_models SET leading_image_url = ? WHERE make_slug = ? AND slug = ?',
      [recent[0].thumbnail_url, make_slug, slug]
    );
    updated++;
    process.stdout.write(`\r  Updated ${updated} | Skipped ${skipped}`);
  } else {
    skipped++;
  }
}

console.log(`\nDone. Updated: ${updated}, Skipped (no recent image): ${skipped}`);
