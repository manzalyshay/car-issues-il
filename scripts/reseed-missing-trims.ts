/**
 * Re-seed trims only for models that currently have no trims in the DB.
 * Uses the same carzone.co.il scraping logic as seed-trims-carzone.ts.
 *
 * Run with: npx tsx scripts/reseed-missing-trims.ts
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Only models still missing trims after the first carzone run
const TARGETS: Record<string, string> = {
  // Lexus — uppercase model abbreviations
  'lexus/es': 'Lexus/ES',
  'lexus/is': 'Lexus/IS',
  'lexus/nx': 'Lexus/NX',
  'lexus/rx': 'Lexus/RX',
  'lexus/rz': 'Lexus/RZ',
  'lexus/ux': 'Lexus/UX',

  // Volvo — uppercase XC/EX prefix
  'volvo/xc40': 'Volvo/XC40',
  'volvo/xc60': 'Volvo/XC60',
  'volvo/xc90': 'Volvo/XC90',
  'volvo/ex30': 'Volvo/EX30',

  // VW T-Roc
  'volkswagen/troc': 'Volkswagen/T-Roc',

  // SEAT
  'seat/arona': 'SEAT/Arona',
  'seat/ateca': 'SEAT/Ateca',
  'seat/ibiza': 'SEAT/Ibiza',
  'seat/leon':  'SEAT/Leon',

  // MG MG4
  'mg/mg4': 'MG/4',

  // Toyota bZ4X
  'toyota/bz4x': 'Toyota/bZ4X',

  // Nissan
  'nissan/x-trail': 'Nissan/X-Trail',
  'nissan/kicks':   'Nissan/Kicks',

  // Suzuki S-Cross
  'suzuki/scross': 'Suzuki/S-Cross',

  // BYD (may not be on carzone)
  'byd/atto3':    'BYD/Atto-3',
  'byd/dolphin':  'BYD/Dolphin',
  'byd/han':      'BYD/Han',
  'byd/seal':     'BYD/Seal',
  'byd/sealion6': 'BYD/Sealion-6',
  'byd/sealion7': 'BYD/Sealion-7',
  'byd/tang':     'BYD/Tang',

  // Mitsubishi
  'mitsubishi/asx':         'Mitsubishi/ASX',
  'mitsubishi/pajero-sport':'Mitsubishi/Pajero-Sport',

  // Kia EV9
  'kia/ev9': 'Kia/EV9',
};

function collectObjects(data: unknown): Record<string, unknown>[] {
  if (typeof data !== 'object' || data === null) return [];
  if (Array.isArray(data)) return data.flatMap(collectObjects);
  const obj = data as Record<string, unknown>;
  const result: Record<string, unknown>[] = [obj];
  if (Array.isArray(obj['@graph'])) {
    result.push(...obj['@graph'].flatMap(collectObjects));
  }
  return result;
}

function stripSuffixes(name: string): string {
  return name
    .replace(/\s+\d+[\.,]\d+\s+ליטר.*$/i, '')
    .replace(/\s+היברידי/g, '')
    .replace(/\s+(4[xX]4|AWD|RWD|FWD|\d+x\d+)/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

async function scrapeTrims(url: string): Promise<string[]> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
    },
  });
  if (!res.ok) return [];
  const html = await res.text();
  const scriptMatches = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  const trims = new Set<string>();
  for (const [, jsonText] of scriptMatches) {
    let data: unknown;
    try { data = JSON.parse(jsonText.trim()); } catch { continue; }
    for (const obj of collectObjects(data)) {
      const variants = obj['hasVariant'];
      if (!Array.isArray(variants)) continue;
      const parentName = typeof obj['name'] === 'string'
        ? obj['name'].trim().replace(/\s{2,}/g, ' ') + ' '
        : '';
      for (const variant of variants) {
        if (typeof variant !== 'object' || variant === null) continue;
        const v = variant as Record<string, unknown>;
        let rawName = typeof v['name'] === 'string' ? v['name'].trim().replace(/\s{2,}/g, ' ') : '';
        if (!rawName) continue;
        if (parentName && rawName.startsWith(parentName)) {
          rawName = rawName.slice(parentName.length).trim();
        }
        const trimName = stripSuffixes(rawName);
        if (!trimName || trimName.length <= 1) continue;
        trims.add(trimName);
      }
    }
  }
  return [...trims];
}

async function updateTrims(makeSlug: string, modelSlug: string, trims: string[]): Promise<boolean> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/car_models?make_slug=eq.${makeSlug}&slug=eq.${modelSlug}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ trims }),
    }
  );
  return res.ok || res.status === 204;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  let updated = 0, noTrims = 0;

  for (const [key, path] of Object.entries(TARGETS)) {
    const [makeSlug, modelSlug] = key.split('/');
    const url = `https://www.carzone.co.il/${path}/`;
    const trims = await scrapeTrims(url);
    if (trims.length === 0) {
      console.log(`⚪ ${key}: no trims (${url})`);
      noTrims++;
    } else {
      const ok = await updateTrims(makeSlug, modelSlug, trims);
      if (ok) { console.log(`✓ ${key}: [${trims.join(', ')}]`); updated++; }
      else { console.error(`✗ ${key}: DB update failed`); }
    }
    await sleep(400);
  }

  console.log(`\nDone. Updated: ${updated}, No trims: ${noTrims}`);
}

run().catch((err) => { console.error('Fatal:', err); process.exit(1); });
