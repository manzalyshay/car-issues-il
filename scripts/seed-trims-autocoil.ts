/**
 * Seed trims for all car models by scraping auto.co.il (Israeli car database).
 * Uses the #sel-car-version dropdown which lists all available versions per model.
 *
 * Run with: npx tsx scripts/seed-trims-autocoil.ts
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Mapping: our DB slug (make/model) → auto.co.il URL path (make/model)
// Only entries that differ from the default (which is make/model as-is) are listed here.
const SLUG_OVERRIDES: Record<string, string> = {
  // Mazda
  'mazda/cx3':    'mazda/cx-3',
  'mazda/cx5':    'mazda/cx-5',
  'mazda/cx30':   'mazda/cx-30',
  'mazda/mazda3': 'mazda/3',
  'mazda/mazda6': 'mazda/6',
  // MX-5 slug on auto.co.il is mx5 (no hyphen) — same as ours, so no override needed

  // BMW
  'bmw/series1': 'bmw/1-series',
  'bmw/series3': 'bmw/3-series',
  'bmw/series5': 'bmw/5-series',

  // Toyota
  'toyota/chr': 'toyota/c-hr',

  // Volkswagen
  'volkswagen/troc': 'volkswagen/t-roc',
  // id3 does not exist on auto.co.il (new model, no page yet)

  // Mercedes (make slug differs: mercedes → mercedes-benz)
  'mercedes/a-class': 'mercedes-benz/a-class',
  'mercedes/b-class': 'mercedes-benz/b-class',
  'mercedes/c-class': 'mercedes-benz/c-class',
  'mercedes/cla':     'mercedes-benz/cla-class',
  'mercedes/e-class': 'mercedes-benz/e-class',
  'mercedes/eqb':     'mercedes-benz/eqb',
  'mercedes/eqc':     'mercedes-benz/eqc',
  'mercedes/gla':     'mercedes-benz/gla-class',
  'mercedes/glb':     'mercedes-benz/glb',
  'mercedes/glc':     'mercedes-benz/glc-class',

  // BYD
  'byd/atto3':    'byd/atto-3',
  'byd/sealion7': 'byd/sealion-7',

  // Honda
  'honda/crv': 'honda/cr-v',
  'honda/hrv': 'honda/hr-v',

  // MG
  'mg/mg-zs': 'mg/zs',

  // Skoda
  'skoda/enyaq': 'skoda/enyaq-iv',
};

// Models known to not exist on auto.co.il — skip them
const SKIP_MODELS = new Set([
  'volkswagen/id3',   // not on auto.co.il
  'byd/sealion6',     // not found
  'chery/arrizo6',    // not found
  'chery/omoda5',     // not found
  'geely/coolray',    // not found
  'geely/emgrand',    // not found
  'mitsubishi/colt',  // not found
]);

function autoCoilUrl(makeSlug: string, modelSlug: string): string | null {
  const key = `${makeSlug}/${modelSlug}`;
  if (SKIP_MODELS.has(key)) return null;
  const override = SLUG_OVERRIDES[key];
  if (override) return `https://www.auto.co.il/cars/${override}/`;
  return `https://www.auto.co.il/cars/${makeSlug}/${modelSlug}/`;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#x27;/g, "'")
    .replace(/&#x2B;/g, '+')
    .replace(/&#x2b;/g, '+')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/** Strip trailing drivetrain suffixes like "4x4", "AWD", "RWD" from trim names */
function stripDrivetrain(name: string): string {
  return name
    .replace(/\s+(4x4|4X4|AWD|RWD|FWD|\d+x\d+)\s*$/i, '')
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

  // Extract all <option value="NNN">TEXT</option> from the sel-car-version dropdown
  const optionMatches = [...html.matchAll(/<option value="\d+">([^<]+)<\/option>/g)];
  const trims = new Set<string>();

  for (const [, rawText] of optionMatches) {
    const decoded = decodeHtmlEntities(rawText);
    const parts = decoded.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) continue;

    // Format: "transmission, engine_size, TRIM_NAME, drivetrain" OR "prefix, engine, TRIM, drivetrain"
    // Trim name is second-to-last part (before drivetrain suffix like 4x4, RWD, AWD etc.)
    const lastPart = parts[parts.length - 1];
    const isLastDrivetrain = /^(4x4|4X4|AWD|RWD|FWD|\d+x\d+)$/i.test(lastPart);

    let trimName: string;
    if (isLastDrivetrain && parts.length >= 3) {
      trimName = parts[parts.length - 2];
    } else {
      trimName = parts[parts.length - 1];
    }

    trimName = stripDrivetrain(trimName.trim());

    // Skip if trim name looks like an engine spec or is just noise
    if (!trimName) continue;
    if (/^[\d.,]/.test(trimName)) continue; // starts with number (engine size)
    if (trimName.includes("ל'")) continue;   // engine displacement in Hebrew
    if (trimName.length <= 1) continue;
    if (/^(אוט|מנ|ידני|HEV|PHEV|Automatic|Manual)/.test(trimName)) continue;

    trims.add(trimName);
  }

  return [...trims];
}

interface CarModel {
  make_slug: string;
  slug: string;
  name_en: string;
}

async function fetchAllModels(): Promise<CarModel[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/car_models?select=make_slug,slug,name_en&order=make_slug,slug`,
    {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    }
  );
  if (!res.ok) throw new Error(`Failed to fetch models: ${res.status} ${await res.text()}`);
  return res.json();
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

  console.log('Fetching all car models from DB...');
  const models = await fetchAllModels();
  console.log(`Found ${models.length} models.\n`);

  let updated = 0;
  let noTrims = 0;
  let skipped = 0;

  for (const model of models) {
    const url = autoCoilUrl(model.make_slug, model.slug);
    const key = `${model.make_slug}/${model.slug}`;

    if (!url) {
      console.log(`⊘ ${key}: skipped (not on auto.co.il)`);
      skipped++;
      continue;
    }

    const trims = await scrapeTrims(url);

    if (trims.length === 0) {
      console.log(`⚪ ${key}: no trims found (${url})`);
      noTrims++;
    } else {
      const ok = await updateTrims(model.make_slug, model.slug, trims);
      if (ok) {
        console.log(`✓ ${key}: [${trims.join(', ')}]`);
        updated++;
      } else {
        console.error(`✗ ${key}: DB update failed`);
        skipped++;
      }
    }

    // Be polite — don't hammer the server
    await sleep(300);
  }

  console.log(`\nDone. Updated: ${updated}, No trims: ${noTrims}, Skipped: ${skipped}`);
}

run().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
