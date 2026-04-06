/**
 * Fix incorrect 3D model assignments — delete entries where the
 * Sketchfab model name clearly doesn't match the car.
 *
 * Run with: npx tsx scripts/fix-3d-models.ts
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function deleteEntry(makeSlug: string, modelSlug: string): Promise<void> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/car_3d_models?make_slug=eq.${makeSlug}&model_slug=eq.${modelSlug}`,
    { method: 'DELETE', headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  if (!res.ok && res.status !== 204) {
    console.error(`  DELETE failed: ${res.status}`);
  }
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Clearly wrong entries: sketchfab model is a completely different car
// Better to show nothing than the wrong model.
const WRONG: Record<string, string> = {
  'mg/ehs':           'Mercedes-Benz GLS',
  'mg/hs':            'Mercedes-Benz GLS',
  'mg/mg-zs':         '25 Low Poly SUVs pack',
  'mg/mg4':           'Polestar 4',
  'mg/mg5':           'Polestar 2',
  'byd/atto3':        'Chevrolet Equinox EV',
  'byd/dolphin':      'Low poly car pack',
  'byd/han':          'Tesla Model S',
  'byd/seal':         'Tesla Model 3',
  'byd/sealion7':     'Audi Q4 e-tron',
  'byd/tang':         'Rivian R1S',
  'chery/arrizo6':    'Kia K5',
  'chery/omoda5':     'Alfa Romeo Stelvio',
  'dacia/sandero':    'Fiat 500 la Prima',
  'dacia/spring':     'Peugeot e-2008',
  'ford/puma':        'Mini Countryman',
  'geely/coolray':    'Kia Sportage',
  'geely/emgrand':    'Kia K5',
  'hyundai/venue':    'Hyundai Kona (wrong model)',
  'kia/seltos':       'Kia Sportage (different model)',
  'kia/stonic':       'Kia Soul',
  'lexus/es':         'Toyota Camry',
  'lexus/is':         'BMW 3 Series',
  'lexus/nx':         'Lexus LX600 (different model)',
  'lexus/rx':         'Lexus GX (different)',
  'lexus/ux':         'Mini Countryman',
  'mercedes/b-class': 'Mercedes E-Class W124 (old wrong model)',
  'mitsubishi/l200':  'Ford Ranger',
  'nissan/navara':    'Ford Ranger',
  'nissan/note':      'Hyundai Ioniq 5',
  'opel/astra':       'Peugeot 3008',
  'opel/crossland':   'Fiat Panda Cross',
  'opel/grandland':   'Peugeot e-2008',
  'opel/mokka':       'Citroen C4',
  'renault/kadjar':   'Porsche Cayenne',
  'seat/arona':       'Fiat 500',
  'seat/ibiza':       'Citroen C4',
  'skoda/scala':      'VW Golf GTI',
  'toyota/bz4x':      'Volvo C40',
  'volkswagen/taigo': 'VW Golf GTI (different model)',
};

async function run() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing env vars');
    process.exit(1);
  }

  let deleted = 0;
  for (const [key, reason] of Object.entries(WRONG)) {
    const [makeSlug, modelSlug] = key.split('/');
    await deleteEntry(makeSlug, modelSlug);
    console.log(`✗ ${key}: deleted (was: ${reason})`);
    deleted++;
    await sleep(80);
  }

  console.log(`\nDeleted ${deleted} wrong entries.`);
  console.log('These cars will now show no 3D model — better than showing the wrong car.');
}

run().catch((err) => { console.error('Fatal:', err); process.exit(1); });
