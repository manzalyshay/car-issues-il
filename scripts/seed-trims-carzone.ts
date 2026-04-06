/**
 * Seed trims for all car models by scraping carzone.co.il (Israeli car database).
 * Extracts trim names from JSON-LD hasVariant schema markup on each model page.
 *
 * Run with: npx tsx scripts/seed-trims-carzone.ts
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Mapping: our DB "make_slug/model_slug" → carzone.co.il URL path "{Make}/{Model}"
 * Only entries that differ from the default title-case transformation are listed.
 */
const SLUG_OVERRIDES: Record<string, string> = {
  // Mazda
  'mazda/cx3':    'Mazda/CX-3',
  'mazda/cx5':    'Mazda/CX-5',
  'mazda/cx30':   'Mazda/CX-30',
  'mazda/mazda3': 'Mazda/Mazda3',
  'mazda/mazda6': 'Mazda/Mazda6',
  'mazda/mx5':    'Mazda/MX-5',

  // BMW (make is all-caps)
  'bmw/series1':  'BMW/1-Series',
  'bmw/series3':  'BMW/3-Series',
  'bmw/series5':  'BMW/5-Series',
  'bmw/x1':       'BMW/X1',
  'bmw/x3':       'BMW/X3',
  'bmw/x5':       'BMW/X5',
  'bmw/x6':       'BMW/X6',
  'bmw/x7':       'BMW/X7',
  'bmw/ix':       'BMW/iX',
  'bmw/ix3':      'BMW/IX3',

  // Toyota
  'toyota/chr':        'Toyota/C-HR',
  'toyota/rav4':       'Toyota/RAV4',
  'toyota/corolla':    'Toyota/Corolla',
  'toyota/camry':      'Toyota/Camry',
  'toyota/yaris':      'Toyota/Yaris',
  'toyota/highlander': 'Toyota/Highlander',
  'toyota/landcruiser':'Toyota/Land-Cruiser',

  // Volkswagen
  'volkswagen/troc':   'Volkswagen/T-ROC',
  'volkswagen/tiguan': 'Volkswagen/Tiguan',
  'volkswagen/golf':   'Volkswagen/Golf',
  'volkswagen/polo':   'Volkswagen/Polo',
  'volkswagen/tcross': 'Volkswagen/T-Cross',
  'volkswagen/id3':    'Volkswagen/ID.3',
  'volkswagen/id4':    'Volkswagen/ID.4',

  // Mercedes-Benz (make slug and class suffix differ)
  'mercedes/a-class': 'Mercedes-Benz/A-Class',
  'mercedes/b-class': 'Mercedes-Benz/B-Class',
  'mercedes/c-class': 'Mercedes-Benz/C-Class',
  'mercedes/cla':     'Mercedes-Benz/CLA',
  'mercedes/e-class': 'Mercedes-Benz/E-Class',
  'mercedes/eqb':     'Mercedes-Benz/EQB',
  'mercedes/eqc':     'Mercedes-Benz/EQC',
  'mercedes/gla':     'Mercedes-Benz/GLA',
  'mercedes/glb':     'Mercedes-Benz/GLB',
  'mercedes/glc':     'Mercedes-Benz/GLC',

  // Audi
  'audi/a3':   'Audi/A3',
  'audi/a4':   'Audi/A4',
  'audi/a5':   'Audi/A5',
  'audi/a6':   'Audi/A6',
  'audi/q2':   'Audi/Q2',
  'audi/q3':   'Audi/Q3',
  'audi/q5':   'Audi/Q5',
  'audi/q7':   'Audi/Q7',
  'audi/etron':'Audi/E-tron',

  // Honda
  'honda/crv': 'Honda/CR-V',
  'honda/hrv': 'Honda/HR-V',

  // MG (make is all-caps)
  'mg/mg-zs': 'MG/ZS',
  'mg/ehs':   'MG/EHS',
  'mg/mg5':   'MG/MG5',

  // BYD (make is all-caps)
  'byd/atto3':    'BYD/Atto-3',
  'byd/sealion6': 'BYD/Sealion-6',
  'byd/sealion7': 'BYD/Sealion-7',
  'byd/seal':     'BYD/Seal',

  // Skoda
  'skoda/enyaq':  'Skoda/Enyaq',
  'skoda/kodiaq': 'Skoda/Kodiaq',
  'skoda/karoq':  'Skoda/Karoq',
  'skoda/octavia':'Skoda/Octavia',
  'skoda/scala':  'Skoda/Scala',
  'skoda/fabia':  'Skoda/Fabia',

  // Kia
  'kia/sportage': 'Kia/Sportage',
  'kia/niro':     'Kia/Niro',
  'kia/ev6':      'Kia/EV6',
  'kia/stonic':   'Kia/Stonic',

  // Hyundai
  'hyundai/tucson':  'Hyundai/Tucson',
  'hyundai/ioniq5':  'Hyundai/Ioniq-5',
  'hyundai/ioniq6':  'Hyundai/Ioniq-6',
  'hyundai/kona':    'Hyundai/Kona',
  'hyundai/i20':     'Hyundai/i20',
  'hyundai/i30':     'Hyundai/i30',

  // Nissan
  'nissan/qashqai': 'Nissan/Qashqai',
  'nissan/juke':    'Nissan/Juke',
  'nissan/leaf':    'Nissan/Leaf',

  // Mitsubishi
  'mitsubishi/eclipse-cross': 'Mitsubishi/Eclipse-Cross',
  'mitsubishi/outlander':     'Mitsubishi/Outlander',
  'mitsubishi/colt':          'Mitsubishi/Colt',

  // Subaru
  'subaru/forester': 'Subaru/Forester',
  'subaru/outback':  'Subaru/Outback',
  'subaru/xv':       'Subaru/XV',

  // Lexus (all model codes are uppercase abbreviations)
  'lexus/es': 'Lexus/ES',
  'lexus/is': 'Lexus/IS',
  'lexus/nx': 'Lexus/NX',
  'lexus/rx': 'Lexus/RX',
  'lexus/rz': 'Lexus/RZ',
  'lexus/ux': 'Lexus/UX',

  // Volvo (XC/EX/S are uppercase)
  'volvo/xc40': 'Volvo/XC40',
  'volvo/xc60': 'Volvo/XC60',
  'volvo/xc90': 'Volvo/XC90',
  'volvo/ex30': 'Volvo/EX30',
  'volvo/ex40': 'Volvo/EX40',
  'volvo/s60':  'Volvo/S60',
  'volvo/s90':  'Volvo/S90',
  'volvo/v60':  'Volvo/V60',

  // MG (all-caps make, mixed model names)
  'mg/mg4':   'MG/4',
  'mg/mg-hs': 'MG/HS',

  // Toyota electric/hybrid with unusual slugs
  'toyota/bz4x': 'Toyota/bZ4X',

  // Nissan
  'nissan/x-trail': 'Nissan/X-Trail',
  'nissan/kicks':   'Nissan/Kicks',

  // Suzuki
  'suzuki/scross': 'Suzuki/S-Cross',

  // Opel
  'opel/crossland': 'Opel/Crossland',
  'opel/grandland': 'Opel/Grandland',
  'opel/mokka':     'Opel/Mokka',

  // Peugeot
  'peugeot/e208': 'Peugeot/e-208',

  // SEAT
  'seat/arona': 'SEAT/Arona',
  'seat/ateca': 'SEAT/Ateca',
  'seat/ibiza': 'SEAT/Ibiza',
  'seat/leon':  'SEAT/Leon',

  // Skoda
  'skoda/enyaq': 'Skoda/Enyaq-IV',

  // Volkswagen
  'volkswagen/troc': 'Volkswagen/T-Roc',
};

// Models known to not exist on carzone.co.il — skip them
const SKIP_MODELS = new Set([
  'chery/arrizo6',
  'chery/omoda5',
  'geely/coolray',
  'geely/emgrand',
  'audi/etron',       // not on carzone.co.il
  'bmw/ix3',          // not on carzone.co.il
  'skoda/enyaq',      // not on carzone.co.il
  'opel/crossland',   // not on carzone.co.il
  'opel/grandland',   // not on carzone.co.il
  'opel/mokka',       // not on carzone.co.il
  'peugeot/e208',     // not on carzone.co.il
  'mg/mg5',           // not on carzone.co.il
]);

/** Convert a DB slug to a default carzone path segment (Title-Case words) */
function titleCase(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('-');
}

function carzoneUrl(makeSlug: string, modelSlug: string): string | null {
  const key = `${makeSlug}/${modelSlug}`;
  if (SKIP_MODELS.has(key)) return null;

  const override = SLUG_OVERRIDES[key];
  if (override) return `https://www.carzone.co.il/${override}/`;

  // Default: title-case both segments
  const make  = titleCase(makeSlug);
  const model = titleCase(modelSlug);
  return `https://www.carzone.co.il/${make}/${model}/`;
}

/** Strip engine size, hybrid label, and drivetrain tokens from a Hebrew trim name */
function stripSuffixes(name: string): string {
  return name
    // Engine displacement + everything after: "1.6 ליטר ..." or "2.5 ליטר ..."
    .replace(/\s+\d+[\.,]\d+\s+ליטר.*$/i, '')
    // Inline "היברידי" (hybrid) label
    .replace(/\s+היברידי/g, '')
    // Drivetrain tokens anywhere (4X4, AWD, RWD, FWD)
    .replace(/\s+(4[xX]4|AWD|RWD|FWD|\d+x\d+)/gi, '')
    // Collapse multiple spaces
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Collect all objects from a JSON-LD value, traversing @graph arrays */
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

async function scrapeTrims(url: string): Promise<string[]> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
    },
  });

  if (!res.ok) return [];

  const html = await res.text();

  // Extract all JSON-LD script blocks
  const scriptMatches = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  const trims = new Set<string>();

  for (const [, jsonText] of scriptMatches) {
    let data: unknown;
    try {
      data = JSON.parse(jsonText.trim());
    } catch {
      continue;
    }

    // Walk all objects including nested @graph
    const objects = collectObjects(data);

    for (const obj of objects) {
      const variants = obj['hasVariant'];
      if (!Array.isArray(variants)) continue;

      // Parent product name is used to strip the "Make Model " prefix from variant names
      // e.g. parent: "יונדאי טוסון", variant: "יונדאי טוסון פרימיום 1.6 ליטר" → "פרימיום"
      const parentName = typeof obj['name'] === 'string' ? obj['name'].trim() + ' ' : '';

      for (const variant of variants) {
        if (typeof variant !== 'object' || variant === null) continue;
        const v = variant as Record<string, unknown>;
        let rawName = typeof v['name'] === 'string' ? v['name'].trim() : '';
        if (!rawName) continue;

        // Strip "Make Model " prefix — normalize whitespace first to handle double spaces
        const normalizedRaw = rawName.replace(/\s{2,}/g, ' ');
        const normalizedParent = parentName.replace(/\s{2,}/g, ' ');
        if (normalizedParent && normalizedRaw.startsWith(normalizedParent)) {
          rawName = normalizedRaw.slice(normalizedParent.length).trim();
        } else {
          rawName = normalizedRaw;
        }

        const trimName = stripSuffixes(rawName);
        if (!trimName || trimName.length <= 1) continue;

        trims.add(trimName);
      }
    }
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
  let notFound = 0;

  for (const model of models) {
    const url = carzoneUrl(model.make_slug, model.slug);
    const key = `${model.make_slug}/${model.slug}`;

    if (!url) {
      console.log(`⊘ ${key}: skipped (not on carzone.co.il)`);
      skipped++;
      continue;
    }

    const trims = await scrapeTrims(url);

    if (trims.length === 0) {
      console.log(`⚪ ${key}: no trims found (${url})`);
      noTrims++;
      notFound++;
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
    await sleep(400);
  }

  console.log(`\nDone. Updated: ${updated}, No trims: ${noTrims}, Skipped: ${skipped}`);
  if (notFound > 0) {
    console.log(`\nTip: ${notFound} models had no trims — add their URL overrides to SLUG_OVERRIDES in this script.`);
  }
}

run().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
