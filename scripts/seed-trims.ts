/**
 * Seed trims for all car models in the Israeli market.
 * Run with: npx ts-node --project tsconfig.json scripts/seed-trims.ts
 * Or: npx tsx scripts/seed-trims.ts
 *
 * Trims reflect the Israeli market (as sold by local importers).
 * Source: importer websites + general knowledge of IL market.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// make_slug / model_slug → trims array
const TRIMS: Record<string, Record<string, string[]>> = {

  // ── Toyota (קבוצת יצוא) ──────────────────────────────────────────────────
  toyota: {
    yaris:         ['Urban', 'Comfort', 'Prestige'],
    'yaris-cross': ['Urban', 'Comfort', 'Prestige', 'GR Sport'],
    corolla:       ['Urban', 'Comfort', 'Prestige', 'GR Sport'],
    'corolla-cross': ['Urban', 'Comfort', 'Prestige'],
    chr:           ['Urban', 'Comfort', 'Prestige', 'GR Sport'],
    rav4:          ['Urban', 'Comfort', 'Prestige', 'Prestige Plus', 'GR Sport'],
    camry:         ['Comfort', 'Prestige', 'GR Sport'],
    prius:         ['Comfort', 'Prestige'],
    'land-cruiser': ['GX', 'VX', 'Executive'],
    hilux:         ['SR5', 'SR5+', 'TRD'],
    bz4x:          ['Comfort', 'Prestige'],
  },

  // ── Hyundai (Champion Motors) ─────────────────────────────────────────────
  hyundai: {
    venue:     ['Smart', 'Comfort', 'Premium'],
    bayon:     ['Smart', 'Comfort', 'Premium'],
    i20:       ['Smart', 'Comfort', 'Premium', 'N Line'],
    i30:       ['Smart', 'Comfort', 'Premium', 'N Line', 'N'],
    elantra:   ['Smart', 'Comfort', 'Premium', 'N Line'],
    kona:      ['Smart', 'Comfort', 'Premium', 'N Line'],
    tucson:    ['Smart', 'Comfort', 'Premium', 'Premium Plus', 'N Line'],
    'santa-fe': ['Comfort', 'Premium', 'Premium Plus'],
    sonata:    ['Comfort', 'Premium'],
    staria:    ['Comfort', 'Premium'],
    'ioniq-5': ['58kWh Standard Range', '73kWh Long Range', '73kWh AWD', 'N'],
    'ioniq-6': ['Standard Range', 'Long Range RWD', 'Long Range AWD'],
  },

  // ── Kia (דלק רכב) ─────────────────────────────────────────────────────────
  kia: {
    picanto:  ['Active', 'Comfort', 'Luxe'],
    stonic:   ['Active', 'Comfort', 'Luxe', 'GT Line'],
    ceed:     ['Active', 'Comfort', 'Luxe', 'GT Line'],
    cerato:   ['Active', 'Comfort', 'Luxe', 'GT Line'],
    niro:     ['Comfort', 'Luxe', 'GT Line'],
    seltos:   ['Active', 'Comfort', 'Luxe', 'GT Line'],
    sportage: ['Active', 'Comfort', 'Luxe', 'GT Line', 'GT Line AWD'],
    sorento:  ['Comfort', 'Luxe', 'GT Line', 'GT Line AWD'],
    carnival: ['Comfort', 'Luxe', 'GT Line'],
    ev6:      ['Standard Range', 'Long Range RWD', 'Long Range AWD', 'GT'],
    ev9:      ['Air RWD', 'Air AWD', 'GT Line AWD', 'Earth AWD'],
  },

  // ── Nissan (רכבי מסחר / קדמוטור) ─────────────────────────────────────────
  nissan: {
    note:     ['Visia', 'Acenta', 'Tekna'],
    juke:     ['Visia', 'Acenta', 'N-Design', 'N-Sport', 'Enigma'],
    kicks:    ['Comfort', 'Prestige'],
    qashqai:  ['Visia', 'Acenta', 'N-Connecta', 'Tekna', 'Tekna+'],
    leaf:     ['Acenta', 'N-Connecta', 'Tekna'],
    'x-trail': ['Acenta', 'N-Connecta', 'Tekna', 'Tekna+', 'e-Power Tekna+'],
    navara:   ['Comfort', 'Prestige', 'Double Cab'],
  },

  // ── Volkswagen (יבואן VW ישראל) ───────────────────────────────────────────
  volkswagen: {
    polo:   ['Life', 'Style', 'R-Line'],
    golf:   ['Life', 'Style', 'R-Line', 'GTI', 'GTD', 'GTE', 'Golf R'],
    troc:   ['Life', 'Style', 'R-Line'],
    taigo:  ['Life', 'Style', 'R-Line'],
    tiguan: ['Life', 'Style', 'R-Line', 'Elegance', 'R'],
    passat: ['Business', 'Elegance', 'R-Line'],
    id3:    ['Pure+', 'Pro', 'Pro S'],
    id4:    ['Pure+', 'Pro', 'Pro S', 'GTX'],
  },

  // ── Skoda (DKR / סקודה ישראל) ─────────────────────────────────────────────
  skoda: {
    fabia:   ['Active', 'Ambition', 'Style'],
    scala:   ['Active', 'Ambition', 'Style', 'Monte Carlo'],
    kamiq:   ['Active', 'Ambition', 'Style', 'Monte Carlo'],
    karoq:   ['Active', 'Ambition', 'Style', 'Sportline'],
    octavia: ['Active', 'Ambition', 'Style', 'Sportline', 'RS'],
    kodiaq:  ['Active', 'Ambition', 'Style', 'Sportline'],
    superb:  ['Active', 'Ambition', 'Style', 'Sportline'],
    enyaq:   ['60', '80', '80x', 'Coupe 80x', 'RS'],
  },

  // ── Mazda (מנדיבי / Champion) ─────────────────────────────────────────────
  mazda: {
    cx3:    ['Dynamic', 'Exclusive-Line', 'Carbon Edition'],
    mazda3: ['Dynamic', 'Exclusive-Line', 'Carbon Edition', 'Homura', 'Nagare'],
    cx30:   ['Dynamic', 'Exclusive-Line', 'Carbon Edition', 'Homura', 'Nagare'],
    cx5:    ['Dynamic', 'Exclusive-Line', 'Carbon Edition', 'Homura', 'Nagare'],
    mazda6: ['Dynamic', 'Exclusive-Line', 'Carbon Edition', 'Signature'],
    mx5:    ['Roadster Soft Top', 'RF'],
  },

  // ── BMW (מילניום) ─────────────────────────────────────────────────────────
  bmw: {
    series1: ['118i', '120i', 'M135i xDrive'],
    series3: ['318i', '320i', '330i', 'M340i xDrive', 'M Sport'],
    series5: ['520i', '523i', '530i', 'M550i xDrive'],
    x1:      ['sDrive18i', 'sDrive20i', 'xDrive20i', 'M Sport'],
    x3:      ['sDrive20i', 'xDrive20i', 'xDrive30i', 'M40i'],
    x5:      ['xDrive40i', 'xDrive30d', 'M50i'],
    ix3:     ['M Sport', 'M Sport Pro'],
  },

  // ── Mercedes (מרצדס ישראל / CATS) ────────────────────────────────────────
  mercedes: {
    'a-class': ['A160', 'A180', 'A200', 'AMG A35'],
    'b-class': ['B180', 'B200'],
    'c-class': ['C180', 'C200', 'C220d', 'C300', 'AMG C43'],
    cla:       ['CLA180', 'CLA200', 'AMG CLA35'],
    'e-class': ['E200', 'E220d', 'E300', 'AMG E53'],
    gla:       ['GLA200', 'GLA220d', 'GLA250', 'AMG GLA35'],
    glb:       ['GLB200', 'GLB220d', 'AMG GLB35'],
    glc:       ['GLC200', 'GLC220d', 'GLC300', 'AMG GLC43'],
    eqb:       ['EQB250', 'EQB350 4MATIC'],
    eqc:       ['EQC400 4MATIC'],
  },

  // ── Audi (פורשה ישראל) ────────────────────────────────────────────────────
  audi: {
    a3:    ['35 TFSI', '40 TFSI', 'S3'],
    a4:    ['35 TFSI', '40 TFSI', '40 TDI', 'S4'],
    a6:    ['40 TFSI', '45 TFSI', '40 TDI', 'S6'],
    q3:    ['35 TFSI', '40 TFSI', 'RS Q3'],
    q5:    ['35 TDI', '40 TDI', '45 TFSI', 'SQ5'],
    etron: ['50 quattro', '55 quattro', 'S e-tron quattro'],
  },

  // ── Volvo (רכבי פרסטיז') ──────────────────────────────────────────────────
  volvo: {
    xc40:  ['Core', 'Plus', 'Ultimate', 'B3', 'B4 AWD', 'Recharge Pure Electric'],
    xc60:  ['Core', 'Plus', 'Ultimate', 'B4 AWD', 'B5 AWD', 'Recharge PHEV'],
    xc90:  ['Core', 'Plus', 'Ultimate', 'B5 AWD', 'B6 AWD', 'Recharge PHEV'],
    s60:   ['Core', 'Plus', 'Ultimate', 'B4', 'Recharge PHEV'],
    ex30:  ['Core', 'Plus', 'Ultra', 'Twin Motor Performance'],
  },

  // ── Seat (יבואן SEAT ישראל) ────────────────────────────────────────────────
  seat: {
    ibiza:  ['Reference', 'Style', 'FR', 'FR Sport'],
    arona:  ['Reference', 'Style', 'FR', 'FR Sport'],
    leon:   ['Reference', 'Style', 'FR', 'FR Sport', 'CUPRA'],
    ateca:  ['Reference', 'Style', 'FR', 'Xperience'],
  },

  // ── CUPRA ─────────────────────────────────────────────────────────────────
  cupra: {
    formentor: ['1.5 TSI', 'VZ2', 'VZ5'],
    ateca:     ['2.0 TSI', 'VZ'],
    born:      ['145kW', '170kW', '231kW'],
  },

  // ── Opel ──────────────────────────────────────────────────────────────────
  opel: {
    corsa:     ['Edition', 'Elegance', 'GS', 'GS Line'],
    astra:     ['Edition', 'Elegance', 'GS', 'GS Line'],
    mokka:     ['Edition', 'Elegance', 'GS', 'GS Line'],
    crossland: ['Edition', 'Elegance', 'GS'],
    grandland: ['Edition', 'Elegance', 'GS', 'GS Line'],
  },

  // ── Peugeot ───────────────────────────────────────────────────────────────
  peugeot: {
    208:   ['Active', 'Allure', 'GT', 'GT Premium'],
    '2008': ['Active', 'Allure', 'GT', 'GT Premium'],
    308:   ['Active', 'Allure', 'GT', 'GT Premium'],
    '3008': ['Active', 'Allure', 'GT', 'GT Premium'],
    '5008': ['Active', 'Allure', 'GT'],
    e208:  ['Active', 'Allure', 'GT'],
  },

  // ── Renault ───────────────────────────────────────────────────────────────
  renault: {
    clio:   ['Zen', 'Intens', 'RS Line', 'E-Tech'],
    megane: ['Zen', 'Intens', 'RS Line', 'RS'],
    kadjar: ['Zen', 'Intens', 'RS Line'],
    arkana: ['Zen', 'Intens', 'RS Line', 'E-Tech'],
    zoe:    ['Life', 'Intens'],
  },

  // ── Dacia ─────────────────────────────────────────────────────────────────
  dacia: {
    sandero: ['Access', 'Essential', 'Comfort', 'Prestige', 'Stepway'],
    duster:  ['Essential', 'Comfort', 'Prestige', 'Prestige Plus'],
    spring:  ['Essential', 'Comfort', 'Extreme'],
  },

  // ── Ford ──────────────────────────────────────────────────────────────────
  ford: {
    fiesta:  ['Trend', 'Titanium', 'ST-Line', 'Vignale'],
    focus:   ['Trend', 'Titanium', 'ST-Line', 'Vignale', 'ST'],
    puma:    ['Trend', 'Titanium', 'ST-Line', 'Vignale'],
    kuga:    ['Trend', 'Titanium', 'ST-Line', 'Vignale', 'ST-Line X'],
    ranger:  ['XL', 'XLT', 'Limited', 'Wildtrak', 'Raptor'],
  },

  // ── Jeep ──────────────────────────────────────────────────────────────────
  jeep: {
    renegade:       ['Longitude', 'Limited', 'Trailhawk', 'S'],
    compass:        ['Longitude', 'Limited', 'Trailhawk', 'S', '4xe PHEV'],
    cherokee:       ['Longitude', 'Limited', 'Trailhawk'],
    'grand-cherokee': ['Laredo', 'Limited', 'Overland', 'Summit', 'Trailhawk', '4xe PHEV'],
    wrangler:       ['Sport', 'Sahara', 'Rubicon', '4xe PHEV'],
    avenger:        ['Longitude', 'Altitude', 'Summit'],
  },

  // ── Mitsubishi ────────────────────────────────────────────────────────────
  mitsubishi: {
    'space-star':   ['Inform', 'Instyle'],
    asx:            ['Inform', 'Intense', 'Instyle'],
    'eclipse-cross': ['Inform', 'Intense', 'Instyle', 'Plug-in Hybrid'],
    outlander:      ['Inform', 'Intense', 'Instyle', 'Plug-in Hybrid'],
    'pajero-sport': ['Intense', 'Instyle'],
    l200:           ['Inform', 'Intense', 'Instyle'],
    colt:           ['Inform', 'Intense', 'Instyle'],
  },

  // ── Honda ─────────────────────────────────────────────────────────────────
  honda: {
    jazz:  ['Comfort', 'Elegance', 'Prestige', 'e:HEV'],
    hrv:   ['Comfort', 'Elegance', 'Prestige'],
    crv:   ['Comfort', 'Elegance', 'Prestige', 'e:HEV', 'e:HEV AWD'],
    civic: ['Comfort', 'Elegance', 'Prestige', 'Sport', 'Type R'],
  },

  // ── Subaru ────────────────────────────────────────────────────────────────
  subaru: {
    impreza: ['Active', 'Comfort', 'Luxury'],
    xv:      ['Active', 'Comfort', 'Luxury', 'e-Boxer'],
    forester: ['Active', 'Comfort', 'Luxury', 'e-Boxer', 'Sport'],
    outback:  ['Comfort', 'Luxury', 'Luxury Plus', 'e-Boxer'],
  },

  // ── Suzuki ────────────────────────────────────────────────────────────────
  suzuki: {
    swift:  ['GL', 'GLX', 'Sport'],
    vitara: ['GL+', 'GLX', 'AllGrip'],
    scross: ['GL+', 'GLX', 'AllGrip'],
    jimny:  ['GL', 'GLX'],
  },

  // ── Lexus ─────────────────────────────────────────────────────────────────
  lexus: {
    is:  ['IS300', 'IS300h', 'IS500 F Sport Performance'],
    es:  ['ES300h', 'F Sport'],
    ux:  ['UX200', 'UX250h', 'F Sport'],
    nx:  ['NX250', 'NX350', 'NX350h', 'NX450h+', 'F Sport'],
    rx:  ['RX350', 'RX350h', 'RX500h', 'F Sport'],
    rz:  ['RZ300e', 'RZ450e', 'F Sport'],
  },

  // ── MG ────────────────────────────────────────────────────────────────────
  mg: {
    'mg-zs':  ['Comfort', 'Luxury', 'EV Comfort', 'EV Luxury'],
    mg4:      ['Comfort', 'Luxury', 'XPOWER'],
    mg5:      ['Comfort', 'Luxury'],
    hs:       ['Comfort', 'Luxury', 'PHEV Comfort', 'PHEV Luxury'],
  },

  // ── BYD ───────────────────────────────────────────────────────────────────
  byd: {
    dolphin:  ['Active', 'Boost', 'Design'],
    atto3:    ['Comfort', 'Design'],
    seal:     ['Design', 'Excellence', 'AWD'],
    han:      ['Design', 'Excellence'],
    tang:     ['Design', 'Excellence'],
    sealion6: ['Design', 'Excellence', 'PHEV', 'DM-i'],
    sealion7: ['Design', 'Excellence', 'AWD'],
  },

  // ── Chery ─────────────────────────────────────────────────────────────────
  chery: {
    arrizo6: ['Comfort', 'Luxury'],
    omoda5:  ['Comfort', 'Luxury'],
    tiggo7:  ['Comfort', 'Luxury', 'PHEV'],
    tiggo8:  ['Comfort', 'Luxury', 'PHEV'],
  },

  // ── Geely ─────────────────────────────────────────────────────────────────
  geely: {
    emgrand: ['Comfort', 'Luxury'],
    coolray: ['Comfort', 'Luxury', 'Sport'],
  },
};

async function run() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    // Fall back to Management API env vars if set via args
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  let updated = 0;
  let skipped = 0;

  for (const [makeSlug, models] of Object.entries(TRIMS)) {
    for (const [modelSlug, trims] of Object.entries(models)) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/car_models?make_slug=eq.${makeSlug}&slug=eq.${modelSlug}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ trims }),
      });

      if (res.ok || res.status === 204) {
        console.log(`✓ ${makeSlug}/${modelSlug}: [${trims.join(', ')}]`);
        updated++;
      } else {
        const text = await res.text();
        console.error(`✗ ${makeSlug}/${modelSlug}: ${res.status} ${text}`);
        skipped++;
      }
    }
  }

  console.log(`\nDone. Updated: ${updated}, Failed: ${skipped}`);
}

run();
