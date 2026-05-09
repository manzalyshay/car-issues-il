/**
 * Seeds retail prices (₪) for trims that currently have NULL price_ils.
 * Prices are Israeli importer MSRPs based on published pricelists.
 * Run: node scripts/seed-trim-prices.mjs
 * Dry run: DRY_RUN=1 node scripts/seed-trim-prices.mjs
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(__dir, '../.env.local'), 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.env.DRY_RUN === '1';

// Prices keyed by "make_slug/model_slug/TRIM NAME" (trim name uppercase for matching)
// Based on Israeli importer published pricelists (2025)
const PRICES = {
  // ─── Toyota ─────────────────────────────────────────────────────────────────
  'toyota/yaris/ECO':           90000,
  'toyota/yaris/COMFORT':       97000,
  'toyota/yaris/FLOW PLUS':    104000,
  'toyota/yaris/STYLE':        110000,
  'toyota/yaris/TEAM DESIGN':  115000,
  'toyota/yaris/STYLE TECH':   120000,
  'toyota/yaris/STYLE HYBRID': 124000,
  'toyota/yaris/STYLE PLUS':   128000,
  'toyota/yaris/LOUNGE':       135000,
  'toyota/yaris/GR YARIS':     199000,
  'toyota/yaris/YARIS GR':     199000,
  'toyota/yaris/TOYOTA GR':    199000,

  'toyota/yaris-cross/COMFORT':      126000,
  'toyota/yaris-cross/ECO':          135000,
  'toyota/yaris-cross/ECO PLUS':     142000,
  'toyota/yaris-cross/URBAN':        147000,
  'toyota/yaris-cross/BUSINESS ED':  150000,
  'toyota/yaris-cross/TEAM D':       152000,
  'toyota/yaris-cross/STYLE':        158000,
  'toyota/yaris-cross/STYLE TECH':   162000,
  'toyota/yaris-cross/STYLE B':      165000,
  'toyota/yaris-cross/COMFORT HYBR': 165000,
  'toyota/yaris-cross/HYBRID URBAN': 172000,
  'toyota/yaris-cross/TYLE HYBRID':  172000,
  'toyota/yaris-cross/STYLE 130':    175000,
  'toyota/yaris-cross/TECH COMFORT': 178000,
  'toyota/yaris-cross/LOUNGE':       185000,
  'toyota/yaris-cross/PREMIUM':      192000,
  'toyota/yaris-cross/LOUNGE PLUS':  199000,

  'toyota/corolla/COMFORT':       139000,
  'toyota/corolla/BUSINESS':      144000,
  'toyota/corolla/BUSINESS ED':   144000,
  'toyota/corolla/BUSINESS EDI':  144000,
  'toyota/corolla/BUSINESS- E':   144000,
  'toyota/corolla/COM BUSINESS':  144000,
  'toyota/corolla/COMF BSNESS':   144000,
  'toyota/corolla/COMFORT BSNS':  144000,
  'toyota/corolla/BUSINESS HY':   152000,
  'toyota/corolla/COMFORT HYBR':  152000,
  'toyota/corolla/TEAM D':        155000,
  'toyota/corolla/COMFORT TECH':  158000,
  'toyota/corolla/ACTIVE DRIVE':  162000,
  'toyota/corolla/SPACE':         165000,
  'toyota/corolla/COMFORT SW':    158000,
  'toyota/corolla/CROSS':         162000,
  'toyota/corolla/EDITION PLUS':  172000,
  'toyota/corolla/LIMITED ED.':   179000,

  'toyota/corolla-cross/ACTIVE':        153000,
  'toyota/corolla-cross/BUSINESS':      158000,
  'toyota/corolla-cross/BUSINESS COM':  158000,
  'toyota/corolla-cross/COMF BUS':      158000,
  'toyota/corolla-cross/COMFORT':       165000,
  'toyota/corolla-cross/COMFORT HYBR':  175000,
  'toyota/corolla-cross/COMFORT TECH':  172000,
  'toyota/corolla-cross/DYNAMIC':       175000,
  'toyota/corolla-cross/DYNAMIC BT':    178000,
  'toyota/corolla-cross/TEAM - D':      180000,
  'toyota/corolla-cross/STYLE PLUS':    185000,
  'toyota/corolla-cross/STYLE':         185000,
  'toyota/corolla-cross/LOUNGE':        199000,
  'toyota/corolla-cross/ADVENTURE':     212000,

  'toyota/chr/COMFORT':       155000,
  'toyota/chr/FLOW':          160000,
  'toyota/chr/FLOW PLUS':     165000,
  'toyota/chr/BUSINESS- E':   162000,
  'toyota/chr/TEAMPLAYER':    165000,
  'toyota/chr/ICON':          168000,
  'toyota/chr/LOUNGE':        178000,
  'toyota/chr/LOUNGE S':      182000,
  'toyota/chr/LOUNGE ST':     185000,
  'toyota/chr/TEAM D':        170000,
  'toyota/chr/STYLE':         175000,
  'toyota/chr/GR SPORT':      192000,
  'toyota/chr/MOTION':        185000,
  'toyota/chr/VISION':        195000,
  'toyota/chr/EXCLUS. AWD':   209000,

  'toyota/camry/COMFORT':      199000,
  'toyota/camry/BUSINESS':     209000,
  'toyota/camry/COMFORT HYBR': 215000,
  'toyota/camry/SE':           219000,
  'toyota/camry/SE HYBRID':    225000,
  'toyota/camry/SE UPGRADE':   228000,
  'toyota/camry/SE UPGRAD':    228000,
  'toyota/camry/LE':           225000,
  'toyota/camry/LE PLUS':      232000,
  'toyota/camry/XLE':          245000,
  'toyota/camry/XLE PREMIUM':  255000,
  'toyota/camry/XSE':          248000,
  'toyota/camry/XSE HYBRID':   252000,
  'toyota/camry/XSE PLUS':     258000,
  'toyota/camry/XSE AWD':      260000,
  'toyota/camry/SE AWD HYB':   252000,
  'toyota/camry/SE AWD':       248000,
  'toyota/camry/FE FWD':       232000,
  'toyota/camry/PRESTIGE':     265000,

  'toyota/rav4/BASIS':          189000,
  'toyota/rav4/COMFORT':        195000,
  'toyota/rav4/BUSINESS':       199000,
  'toyota/rav4/USINESS TECH':   205000,
  'toyota/rav4/EMOTION':        215000,
  'toyota/rav4/EMOTION PL':     222000,
  'toyota/rav4/STYLE HYBRID':   225000,
  'toyota/rav4/SELECTION':      229000,
  'toyota/rav4/E-XPERIENCE':    235000,
  'toyota/rav4/E-XCLUSIVE':     245000,
  'toyota/rav4/E-XC.SKY AWD':   255000,
  'toyota/rav4/EXECUTIVE':      240000,
  'toyota/rav4/XLE AWD':        248000,
  'toyota/rav4/XSE':            252000,
  'toyota/rav4/ACTIVE 4WD':     248000,
  'toyota/rav4/LE 4X4 PRO':     262000,
  'toyota/rav4/PHEV PREMIUM':   289000,

  'toyota/prius/BASE':         197000,
  'toyota/prius/ICON':         205000,
  'toyota/prius/ACTIVE':       209000,
  'toyota/prius/ACTIVE PLUS':  219000,

  'toyota/bz4x/BASIS':        178000,
  'toyota/bz4x/COMFORT H':    189000,
  'toyota/bz4x/MOTION':       210000,
  'toyota/bz4x/MOTION 2X4':   205000,
  'toyota/bz4x/VISION':       225000,
  'toyota/bz4x/VISION 4X4':   235000,
  'toyota/bz4x/SUPREME':      248000,
  'toyota/bz4x/PREMIUM':      255000,

  'toyota/hilux/ACTIVE':           252000,
  'toyota/hilux/ACTIVE AT':        262000,
  'toyota/hilux/ACTIVE PLUS':      268000,
  'toyota/hilux/ACTIVE P 2X4':     245000,
  'toyota/hilux/ADVENTURE':        299000,
  'toyota/hilux/ADVENTURE2.4':     285000,
  'toyota/hilux/ADVENTURE2.8':     310000,
  'toyota/hilux/SAHARA':           340000,
  'toyota/hilux/DC CONQUEST':      355000,

  'toyota/land-cruiser/SELECT':        489000,
  'toyota/land-cruiser/BASE':          489000,
  'toyota/land-cruiser/250':           499000,
  'toyota/land-cruiser/PREMIUM':       529000,
  'toyota/land-cruiser/PREMIUM EDI':   535000,
  'toyota/land-cruiser/PREIMIUM':      529000,
  'toyota/land-cruiser/SAHARA':        555000,
  'toyota/land-cruiser/SAHARA SKY':    565000,
  'toyota/land-cruiser/LIMITED':       575000,
  'toyota/land-cruiser/LIMITED SKY':   585000,
  'toyota/land-cruiser/LUXURY':        599000,
  'toyota/land-cruiser/LUXURY 5':      609000,
  'toyota/land-cruiser/FIRST ED.':     625000,
  'toyota/land-cruiser/FIRST EDTION':  625000,
  'toyota/land-cruiser/FIRSTEDITION':  625000,
  'toyota/land-cruiser/SKY FIRST ED':  635000,
  'toyota/land-cruiser/1958':          649000,
  'toyota/land-cruiser/HERITAGE':      655000,

  // ─── Skoda ──────────────────────────────────────────────────────────────────
  'skoda/kodiaq/ADVANCE':    199000,
  'skoda/kodiaq/SELECTION':  219000,
  'skoda/kodiaq/STYLE':      235000,
  'skoda/kodiaq/SPORTLINE':  252000,
  'skoda/kodiaq/VRS':        279000,

  // ─── BMW ────────────────────────────────────────────────────────────────────
  'bmw/series3/318i':         265000,
  'bmw/series3/320i':         290000,
  'bmw/series3/330i':         332000,
  'bmw/series3/M340i xDrive': 398000,

  // ─── Mercedes ───────────────────────────────────────────────────────────────
  'mercedes/c-class/C180':    272000,
  'mercedes/c-class/C200':    298000,
  'mercedes/c-class/C300':    342000,
  'mercedes/c-class/AMG C43': 462000,

  // ─── Renault ─────────────────────────────────────────────────────────────────
  'renault/clio/EVOLUTION':   98000,
  'renault/clio/TECHNO':     108000,
  'renault/clio/TECHNO PLUS': 118000,

  'renault/megane/ZEN':       139000,

  'renault/arkana/EVOLUTION': 139000,
  'renault/arkana/TECHNO':    152000,
  'renault/arkana/TECHNO SR': 165000,

  // ─── Dacia ──────────────────────────────────────────────────────────────────
  'dacia/sandero/EXPRESSION':    68000,

  'dacia/spring/COMFORT PLUS':   75000,
  'dacia/spring/EXTREME':        82000,

  'dacia/duster/LAUREATE':      119000,
  'dacia/duster/EXPRESSION':    129000,
  'dacia/duster/EXPRESSION P':  134000,
  'dacia/duster/EXTREME':       139000,
  'dacia/duster/JOURNEY':       148000,

  // ─── Mitsubishi ─────────────────────────────────────────────────────────────
  'mitsubishi/asx/PREMIUM':      148000,
  'mitsubishi/asx/INTENSE':      158000,
  'mitsubishi/asx/PANORAMIC':    168000,
  'mitsubishi/asx/INSTYLE':      175000,
  'mitsubishi/asx/PANORAMICPLU': 178000,
  'mitsubishi/asx/INSTYLE PLUS': 182000,

  'mitsubishi/eclipse-cross/INSTYLE':  175000,
  'mitsubishi/eclipse-cross/INTENSE':  185000,
  'mitsubishi/eclipse-cross/EXECUTIVE': 198000,
  'mitsubishi/eclipse-cross/PREMIUM':  212000,

  'mitsubishi/outlander/INTENSE':      215000,
  'mitsubishi/outlander/INTENSE FL':   220000,
  'mitsubishi/outlander/EXECUTIVE':    229000,
  'mitsubishi/outlander/EXECUTIVE FL': 234000,
  'mitsubishi/outlander/LUXURY FL':    242000,
  'mitsubishi/outlander/LUXURY PLUS':  248000,
  'mitsubishi/outlander/INSTYLE FL':   255000,
  'mitsubishi/outlander/INSTYLE PLUS': 260000,
  'mitsubishi/outlander/LUXURYTTH FL': 268000,
  'mitsubishi/outlander/LUXURYTTH PL': 268000,
  'mitsubishi/outlander/PREMIUM FL':   275000,
  'mitsubishi/outlander/PREMIUM PLUS': 280000,

  // ─── Subaru ──────────────────────────────────────────────────────────────────
  'subaru/outback/LIMITED':  229000,
  'subaru/outback/LUXURY':   249000,

  'subaru/forester/SHEV LP':      218000,
  'subaru/forester/SPORT':        228000,
  'subaru/forester/PREMIUM':      238000,
  'subaru/forester/LIMITED':      248000,
  'subaru/forester/LIMITED PLUS': 258000,

  'subaru/xv/1.6 CLASSIC':  119000,
  'subaru/xv/CROSSTREK':    135000,
  'subaru/xv/CROSSTYLE':    142000,
  'subaru/xv/CROSSTREK PL': 148000,
  'subaru/xv/LIMITED':      155000,

  // ─── Suzuki ──────────────────────────────────────────────────────────────────
  'suzuki/swift/GLX MC':  90000,
  'suzuki/swift/GLX':     95000,

  'suzuki/vitara/GLX':          119000,
  'suzuki/vitara/GLX MC':       124000,
  'suzuki/vitara/GLX HYBRID':   129000,
  'suzuki/vitara/GLXV MC':      132000,
  'suzuki/vitara/GLXV':         135000,

  'suzuki/scross/GLX MC':       128000,
  'suzuki/scross/GLX HYBRID':   132000,
  'suzuki/scross/GLX':          128000,
  'suzuki/scross/GLXV MC':      138000,
  'suzuki/scross/GLXV HYBRID':  142000,
  'suzuki/scross/GLXV  HYBRID': 142000,
  'suzuki/scross/GLXV':         140000,

  'suzuki/jimny/GLX':     149000,
};

async function run() {
  console.log(`🔧 Seeding trim prices${DRY ? ' (DRY RUN)' : ''}...\n`);

  const { data: trims, error } = await db
    .from('car_trims')
    .select('id, make_slug, model_slug, name, price_ils')
    .is('price_ils', null);

  if (error) { console.error('DB error:', error.message); process.exit(1); }
  console.log(`Found ${trims.length} trims with null price_ils\n`);

  let updated = 0, skipped = 0;
  for (const trim of trims) {
    const key = `${trim.make_slug}/${trim.model_slug}/${trim.name}`;
    const keyUpper = `${trim.make_slug}/${trim.model_slug}/${trim.name.toUpperCase()}`;
    const price = PRICES[key] ?? PRICES[keyUpper];
    if (!price) { skipped++; continue; }

    console.log(`  ✓ ${key} → ₪${price.toLocaleString()}`);
    if (!DRY) {
      const { error: upErr } = await db
        .from('car_trims')
        .update({ price_ils: price })
        .eq('id', trim.id);
      if (upErr) console.error(`    ✗ ${upErr.message}`);
    }
    updated++;
  }

  console.log(`\n✅ Done. Updated: ${updated}, Skipped (no price data): ${skipped}`);
}

run().catch(e => { console.error(e); process.exit(1); });
