/**
 * Adds Alfa Romeo, Land Rover, Porsche makes + models.
 * Run: node scripts/seed-alfa-landrover-porsche.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dir, '../.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)/);
      if (m) process.env[m[1].trim()] = m[2].trim();
    }
  } catch { /* ignore */ }
}
loadEnv();

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const NEW_MAKES = [
  {
    slug: 'alfa-romeo', name_he: 'אלפא רומיאו', name_en: 'Alfa Romeo',
    country: 'איטליה', logo_url: 'https://cdn.simpleicons.org/alfaromeo',
    is_popular: true, sort_order: 0,
  },
  {
    slug: 'land-rover', name_he: 'לנד רובר', name_en: 'Land Rover',
    country: 'בריטניה', logo_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Land_Rover_logo.svg/120px-Land_Rover_logo.svg.png',
    is_popular: true, sort_order: 0,
  },
  {
    slug: 'porsche', name_he: 'פורשה', name_en: 'Porsche',
    country: 'גרמניה', logo_url: 'https://cdn.simpleicons.org/porsche',
    is_popular: true, sort_order: 0,
  },
];

const NEW_MODELS = [
  // ── Alfa Romeo ────────────────────────────────────────────────────────────────
  {
    make_slug: 'alfa-romeo', slug: 'giulia', name_he: 'ג׳וליה', name_en: 'Giulia',
    years: [2025,2024,2023,2022,2021,2020,2019,2018,2017,2016],
    category: 'sedan', sort_order: 0,
    trims: ['Super', 'Sprint', 'Ti', 'Quadrifoglio', 'Veloce'],
  },
  {
    make_slug: 'alfa-romeo', slug: 'stelvio', name_he: 'סטלביו', name_en: 'Stelvio',
    years: [2025,2024,2023,2022,2021,2020,2019,2018,2017],
    category: 'suv', sort_order: 1,
    trims: ['Super', 'Sprint', 'Ti', 'Quadrifoglio', 'Veloce'],
  },
  {
    make_slug: 'alfa-romeo', slug: 'tonale', name_he: 'טונאלה', name_en: 'Tonale',
    years: [2025,2024,2023,2022],
    category: 'suv', sort_order: 2,
    trims: ['Sprint', 'Ti', 'Veloce', 'Plug-in Hybrid Q4'],
  },
  {
    make_slug: 'alfa-romeo', slug: 'giulietta', name_he: 'ג׳וליאטה', name_en: 'Giulietta',
    years: [2020,2019,2018,2017,2016,2015,2014,2013,2012,2011,2010],
    category: 'hatchback', sort_order: 3,
    trims: ['Progression', 'Distinctive', 'Exclusive', 'Quadrifoglio Verde', 'Sprint'],
  },

  // ── Land Rover ────────────────────────────────────────────────────────────────
  {
    make_slug: 'land-rover', slug: 'defender', name_he: 'דיפנדר', name_en: 'Defender',
    years: [2025,2024,2023,2022,2021,2020],
    category: 'suv', sort_order: 0,
    trims: ['90 S', '90 SE', '90 HSE', '110 S', '110 SE', '110 HSE', '110 X', 'V8'],
  },
  {
    make_slug: 'land-rover', slug: 'discovery', name_he: 'דיסקברי', name_en: 'Discovery',
    years: [2025,2024,2023,2022,2021,2020,2019,2018,2017],
    category: 'suv', sort_order: 1,
    trims: ['S', 'SE', 'HSE', 'HSE Luxury', 'R-Dynamic S', 'R-Dynamic SE', 'R-Dynamic HSE'],
  },
  {
    make_slug: 'land-rover', slug: 'discovery-sport', name_he: 'דיסקברי ספורט', name_en: 'Discovery Sport',
    years: [2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015],
    category: 'suv', sort_order: 2,
    trims: ['S', 'SE', 'HSE', 'R-Dynamic S', 'R-Dynamic SE', 'R-Dynamic HSE'],
  },
  {
    make_slug: 'land-rover', slug: 'range-rover', name_he: 'ריינג׳ רובר', name_en: 'Range Rover',
    years: [2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015,2014,2013],
    category: 'suv', sort_order: 3,
    trims: ['SE', 'HSE', 'HSE Dynamic', 'Autobiography', 'SVAutobiography', 'PHEV'],
  },
  {
    make_slug: 'land-rover', slug: 'range-rover-sport', name_he: 'ריינג׳ רובר ספורט', name_en: 'Range Rover Sport',
    years: [2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015,2014,2013],
    category: 'suv', sort_order: 4,
    trims: ['S', 'SE', 'HSE', 'HSE Dynamic', 'Autobiography Dynamic', 'SVR', 'PHEV'],
  },
  {
    make_slug: 'land-rover', slug: 'range-rover-evoque', name_he: 'ריינג׳ רובר אבוק', name_en: 'Range Rover Evoque',
    years: [2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015,2014,2013,2012],
    category: 'suv', sort_order: 5,
    trims: ['S', 'SE', 'HSE', 'R-Dynamic S', 'R-Dynamic SE', 'R-Dynamic HSE', 'PHEV'],
  },
  {
    make_slug: 'land-rover', slug: 'range-rover-velar', name_he: 'ריינג׳ רובר ולאר', name_en: 'Range Rover Velar',
    years: [2025,2024,2023,2022,2021,2020,2019,2018,2017],
    category: 'suv', sort_order: 6,
    trims: ['S', 'SE', 'HSE', 'R-Dynamic S', 'R-Dynamic SE', 'R-Dynamic HSE', 'SVAutobiography'],
  },

  // ── Porsche ───────────────────────────────────────────────────────────────────
  {
    make_slug: 'porsche', slug: 'cayenne', name_he: 'קאיין', name_en: 'Cayenne',
    years: [2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015,2014,2013],
    category: 'suv', sort_order: 0,
    trims: ['Base', 'S', 'GTS', 'Turbo', 'Turbo S', 'E-Hybrid', 'Turbo E-Hybrid'],
  },
  {
    make_slug: 'porsche', slug: 'macan', name_he: 'מאקן', name_en: 'Macan',
    years: [2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015,2014],
    category: 'suv', sort_order: 1,
    trims: ['Base', 'S', 'GTS', 'Turbo', 'T', 'Macan Electric'],
  },
  {
    make_slug: 'porsche', slug: '911', name_he: '911', name_en: '911',
    years: [2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015,2014,2013],
    category: 'coupe', sort_order: 2,
    trims: ['Carrera', 'Carrera S', 'Carrera 4', 'Carrera 4S', 'Targa 4', 'Targa 4S', 'GT3', 'Turbo', 'Turbo S'],
  },
  {
    make_slug: 'porsche', slug: 'panamera', name_he: 'פנמרה', name_en: 'Panamera',
    years: [2025,2024,2023,2022,2021,2020,2019,2018,2017],
    category: 'sedan', sort_order: 3,
    trims: ['Base', 'S', '4S', 'GTS', 'Turbo', 'Turbo S', '4 E-Hybrid', 'Turbo S E-Hybrid'],
  },
  {
    make_slug: 'porsche', slug: 'taycan', name_he: 'טייקן', name_en: 'Taycan',
    years: [2025,2024,2023,2022,2021,2020],
    category: 'electric', sort_order: 4,
    trims: ['Base', '4S', 'GTS', 'Turbo', 'Turbo S', 'Sport Turismo', 'Cross Turismo'],
  },
];

async function run() {
  console.log('Upserting makes...');
  for (const make of NEW_MAKES) {
    const { error } = await sb.from('car_makes').upsert(make, { onConflict: 'slug' });
    if (error) console.warn(`  ✗ ${make.slug}:`, error.message);
    else console.log(`  ✓ ${make.slug}`);
  }

  console.log('\nUpserting models...');
  for (const model of NEW_MODELS) {
    const { error } = await sb.from('car_models').upsert(model, { onConflict: 'make_slug,slug' });
    if (error) console.warn(`  ✗ ${model.make_slug}/${model.slug}:`, error.message);
    else console.log(`  ✓ ${model.make_slug}/${model.slug}`);
  }

  console.log('\n✅ Done!');
}

run();
