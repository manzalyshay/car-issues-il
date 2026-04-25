/**
 * Adds Fiat, Chevrolet, Tesla makes + models,
 * and splits Mercedes A-Class into A180/A200/A220/A250/A35 AMG/A45 AMG.
 */
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// ── New makes ─────────────────────────────────────────────────────────────────
const NEW_MAKES = [
  {
    slug: 'fiat', name_he: 'פיאט', name_en: 'Fiat',
    country: 'איטליה', logo_url: 'https://cdn.simpleicons.org/fiat',
    is_popular: true, sort_order: 0,
  },
  {
    slug: 'chevrolet', name_he: 'שברולט', name_en: 'Chevrolet',
    country: 'ארה״ב', logo_url: 'https://cdn.simpleicons.org/chevrolet',
    is_popular: false, sort_order: 0,
  },
  {
    slug: 'tesla', name_he: 'טסלה', name_en: 'Tesla',
    country: 'ארה״ב', logo_url: 'https://cdn.simpleicons.org/tesla',
    is_popular: true, sort_order: 0,
  },
];

// ── New models ────────────────────────────────────────────────────────────────
const NEW_MODELS = [
  // ── Fiat ──────────────────────────────────────────────────────────────────
  {
    make_slug: 'fiat', slug: 'fiat-500', name_he: '500', name_en: '500',
    years: [2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015,2014,2013,2012],
    category: 'hatchback', sort_order: 0,
    trims: ['500 קולצ׳יונה', '500 לאונצ׳', '500 בייס', '500 פופ', '500 לאונג׳'],
  },
  {
    make_slug: 'fiat', slug: 'fiat-500e', name_he: '500e', name_en: '500e',
    years: [2025,2024,2023,2022,2021],
    category: 'electric', sort_order: 1,
    trims: ['Action', 'Passion', 'Icon', 'La Prima'],
  },
  {
    make_slug: 'fiat', slug: 'tipo', name_he: 'טיפו', name_en: 'Tipo',
    years: [2025,2024,2023,2022,2021,2020,2019,2018,2017,2016],
    category: 'sedan', sort_order: 2,
    trims: ['פופ', 'מירור', 'טאיפ', 'לייף', 'City Life', 'City Sport'],
  },
  {
    make_slug: 'fiat', slug: 'tipo-cross', name_he: 'טיפו קרוס', name_en: 'Tipo Cross',
    years: [2025,2024,2023,2022,2021],
    category: 'suv', sort_order: 3,
    trims: ['Cross', 'Cross Plus'],
  },
  {
    make_slug: 'fiat', slug: 'fiat-500x', name_he: '500X', name_en: '500X',
    years: [2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015],
    category: 'suv', sort_order: 4,
    trims: ['Pop', 'Sport', 'Urban', 'Cross', 'Dolcevita'],
  },
  {
    make_slug: 'fiat', slug: 'panda', name_he: 'פנדה', name_en: 'Panda',
    years: [2024,2023,2022,2021,2020,2019,2018,2017,2016,2015,2014,2013,2012],
    category: 'hatchback', sort_order: 5,
    trims: ['Pop', 'Sport', 'City Life', 'Cross', 'Waze'],
  },
  {
    make_slug: 'fiat', slug: 'ducato', name_he: 'דוקאטו', name_en: 'Ducato',
    years: [2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015],
    category: 'van', sort_order: 6,
    trims: ['חצי טון', 'שלושת רבעי טון', 'L1H1', 'L2H2', 'L3H2', 'L4H3'],
  },
  {
    make_slug: 'fiat', slug: 'doblo', name_he: 'דובלו', name_en: 'Doblò',
    years: [2024,2023,2022,2021,2020,2019,2018,2017,2016,2015,2014,2013],
    category: 'van', sort_order: 7,
    trims: ['קומבי', 'קארגו', 'פאמיליארה', 'Maxi'],
  },

  // ── Chevrolet ─────────────────────────────────────────────────────────────
  {
    make_slug: 'chevrolet', slug: 'spark', name_he: 'ספארק', name_en: 'Spark',
    years: [2022,2021,2020,2019,2018,2017,2016,2015,2014,2013,2012],
    category: 'hatchback', sort_order: 0,
    trims: ['LS', 'LT', 'LTZ', 'Activ'],
  },
  {
    make_slug: 'chevrolet', slug: 'cruze', name_he: 'קרוז', name_en: 'Cruze',
    years: [2020,2019,2018,2017,2016,2015,2014,2013,2012,2011,2010],
    category: 'sedan', sort_order: 1,
    trims: ['LS', 'LT', 'LTZ', 'Premier', '1.4T', '1.8'],
  },
  {
    make_slug: 'chevrolet', slug: 'captiva', name_he: 'קפטיבה', name_en: 'Captiva',
    years: [2020,2019,2018,2017,2016,2015,2014,2013,2012,2011,2010,2009],
    category: 'suv', sort_order: 2,
    trims: ['LS', 'LT', 'LTZ', 'Sport', '4WD', '2WD'],
  },
  {
    make_slug: 'chevrolet', slug: 'equinox', name_he: 'אקוינוקס', name_en: 'Equinox',
    years: [2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015],
    category: 'suv', sort_order: 3,
    trims: ['LS', 'LT', 'RS', 'Premier', 'EV'],
  },
  {
    make_slug: 'chevrolet', slug: 'trailblazer', name_he: 'טרייל בלייזר', name_en: 'Trailblazer',
    years: [2025,2024,2023,2022,2021,2020],
    category: 'suv', sort_order: 4,
    trims: ['LS', 'LT', 'RS', 'ACTIV', 'Premier'],
  },
  {
    make_slug: 'chevrolet', slug: 'malibu', name_he: 'מליבו', name_en: 'Malibu',
    years: [2023,2022,2021,2020,2019,2018,2017,2016,2015,2014,2013],
    category: 'sedan', sort_order: 5,
    trims: ['LS', 'LT', 'RS', 'Premier'],
  },
  {
    make_slug: 'chevrolet', slug: 'tahoe', name_he: 'טאהו', name_en: 'Tahoe',
    years: [2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015],
    category: 'suv', sort_order: 6,
    trims: ['LS', 'LT', 'Z71', 'RST', 'Premier', 'High Country'],
  },
  {
    make_slug: 'chevrolet', slug: 'colorado', name_he: 'קולורדו', name_en: 'Colorado',
    years: [2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015],
    category: 'pickup', sort_order: 7,
    trims: ['WT', 'LT', 'Z71', 'ZR2', 'Trail Boss'],
  },
  {
    make_slug: 'chevrolet', slug: 'camaro', name_he: 'קמרו', name_en: 'Camaro',
    years: [2024,2023,2022,2021,2020,2019,2018,2017,2016,2015],
    category: 'coupe', sort_order: 8,
    trims: ['1LS', '1LT', '2LT', '1SS', '2SS', 'ZL1'],
  },

  // ── Tesla ─────────────────────────────────────────────────────────────────
  {
    make_slug: 'tesla', slug: 'model-3', name_he: 'מודל 3', name_en: 'Model 3',
    years: [2025,2024,2023,2022,2021,2020,2019,2018,2017],
    category: 'electric', sort_order: 0,
    trims: ['Standard Range RWD', 'Long Range AWD', 'Performance', 'Highland RWD', 'Highland Long Range AWD', 'Highland Performance'],
  },
  {
    make_slug: 'tesla', slug: 'model-y', name_he: 'מודל Y', name_en: 'Model Y',
    years: [2025,2024,2023,2022,2021,2020],
    category: 'electric', sort_order: 1,
    trims: ['Standard Range RWD', 'Long Range AWD', 'Performance', 'Juniper RWD', 'Juniper Long Range AWD', 'Juniper Performance'],
  },
  {
    make_slug: 'tesla', slug: 'model-s', name_he: 'מודל S', name_en: 'Model S',
    years: [2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015],
    category: 'electric', sort_order: 2,
    trims: ['Long Range', 'Plaid', 'Standard Range'],
  },
  {
    make_slug: 'tesla', slug: 'model-x', name_he: 'מודל X', name_en: 'Model X',
    years: [2025,2024,2023,2022,2021,2020,2019,2018,2017,2016],
    category: 'electric', sort_order: 3,
    trims: ['Long Range', 'Plaid', 'Standard Range'],
  },

  // ── Mercedes C-Class split ────────────────────────────────────────────────
  {
    make_slug: 'mercedes', slug: 'c180', name_he: 'C180', name_en: 'C180',
    years: [2021,2020,2019,2018,2017,2016,2015,2014,2013,2012],
    category: 'sedan', sort_order: 60,
    trims: ['Avantgarde', 'Exclusive', 'AMG Line', 'Classic'],
  },
  {
    make_slug: 'mercedes', slug: 'c200', name_he: 'C200', name_en: 'C200',
    years: [2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015,2014],
    category: 'sedan', sort_order: 61,
    trims: ['Avantgarde', 'Exclusive', 'AMG Line', 'Night Edition', '4MATIC'],
  },
  {
    make_slug: 'mercedes', slug: 'c220d', name_he: 'C220d', name_en: 'C220d',
    years: [2024,2023,2022,2021,2020,2019,2018,2017,2016,2015,2014],
    category: 'sedan', sort_order: 62,
    trims: ['Avantgarde', 'AMG Line', '4MATIC', 'Exclusive'],
  },
  {
    make_slug: 'mercedes', slug: 'c300', name_he: 'C300', name_en: 'C300',
    years: [2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015],
    category: 'sedan', sort_order: 63,
    trims: ['AMG Line', 'Exclusive', '4MATIC', 'Night Edition'],
  },
  {
    make_slug: 'mercedes', slug: 'c300d', name_he: 'C300d', name_en: 'C300d',
    years: [2025,2024,2023,2022,2021,2020,2019,2018],
    category: 'sedan', sort_order: 64,
    trims: ['AMG Line', '4MATIC', 'Exclusive'],
  },
  {
    make_slug: 'mercedes', slug: 'c43-amg', name_he: 'C43 AMG', name_en: 'C43 AMG',
    years: [2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015],
    category: 'sedan', sort_order: 65,
    trims: ['AMG', 'AMG 4MATIC', 'AMG Night Edition'],
  },
  {
    make_slug: 'mercedes', slug: 'c63-amg', name_he: 'C63 AMG', name_en: 'C63 AMG',
    years: [2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015,2014],
    category: 'sedan', sort_order: 66,
    trims: ['C63 AMG', 'C63 AMG S', 'C63 AMG 4MATIC', 'C63 AMG S 4MATIC'],
  },

  // ── Mercedes A-Class split ─────────────────────────────────────────────────
  {
    make_slug: 'mercedes', slug: 'a180', name_he: 'A180', name_en: 'A180',
    years: [2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015,2014,2013],
    category: 'hatchback', sort_order: 50,
    trims: ['Progressive Line', 'AMG Line', 'Style', 'Urban', 'Sport Edition'],
  },
  {
    make_slug: 'mercedes', slug: 'a200', name_he: 'A200', name_en: 'A200',
    years: [2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015],
    category: 'hatchback', sort_order: 51,
    trims: ['Progressive Line', 'AMG Line', 'Style', 'Night Edition'],
  },
  {
    make_slug: 'mercedes', slug: 'a220', name_he: 'A220', name_en: 'A220',
    years: [2025,2024,2023,2022,2021,2020,2019],
    category: 'hatchback', sort_order: 52,
    trims: ['AMG Line', 'Progressive Line', '4MATIC'],
  },
  {
    make_slug: 'mercedes', slug: 'a250', name_he: 'A250', name_en: 'A250',
    years: [2024,2023,2022,2021,2020,2019,2018,2017,2016,2015,2014],
    category: 'hatchback', sort_order: 53,
    trims: ['AMG Line', 'Sport', '4MATIC'],
  },
  {
    make_slug: 'mercedes', slug: 'a35-amg', name_he: 'A35 AMG', name_en: 'A35 AMG',
    years: [2025,2024,2023,2022,2021,2020,2019],
    category: 'hatchback', sort_order: 54,
    trims: ['AMG', 'AMG 4MATIC', 'AMG Night Edition'],
  },
  {
    make_slug: 'mercedes', slug: 'a45-amg', name_he: 'A45 AMG', name_en: 'A45 AMG',
    years: [2024,2023,2022,2021,2020,2019,2018,2017,2016,2015,2014,2013],
    category: 'hatchback', sort_order: 55,
    trims: ['A45 AMG', 'A45 S AMG', 'A45 AMG 4MATIC', 'A45 S AMG 4MATIC'],
  },
];

async function run() {
  // 1. Remove old generic A-Class and C-Class entries
  console.log('Removing Mercedes A-Class and C-Class...');
  for (const slug of ['a-class', 'c-class']) {
    const { error } = await sb.from('car_models').delete()
      .eq('make_slug', 'mercedes').eq('slug', slug);
    if (error) console.warn(`  ✗ ${slug}:`, error.message);
    else console.log(`  ✓ Removed ${slug}`);
  }

  // 2. Upsert new makes
  console.log('\nUpserting makes...');
  for (const make of NEW_MAKES) {
    const { error } = await sb.from('car_makes').upsert(make, { onConflict: 'slug' });
    if (error) console.warn(`  ✗ ${make.slug}:`, error.message);
    else console.log(`  ✓ ${make.slug}`);
  }

  // 3. Upsert new models
  console.log('\nUpserting models...');
  for (const model of NEW_MODELS) {
    const { error } = await sb.from('car_models')
      .upsert(model, { onConflict: 'make_slug,slug' });
    if (error) console.warn(`  ✗ ${model.make_slug}/${model.slug}:`, error.message);
    else console.log(`  ✓ ${model.make_slug}/${model.slug}`);
  }

  console.log('\n✅ Done!');
}

run();
