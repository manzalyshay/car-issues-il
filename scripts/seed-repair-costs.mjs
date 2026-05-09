/**
 * Seeds repair_costs table with data scraped from midrag.co.il
 * Source attribution is stored per record.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dir = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(__dir, '../.env.local'), 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// applies_to values: 'all', 'small', 'family', 'suv', 'luxury'
const REPAIRS = [
  // ─── Services ─────────────────────────────────────────────────────────────
  {
    repair_key: 'service_10k', repair_name_he: 'טיפול 10,000 ק"מ', repair_name_en: '10,000 km service',
    category: 'service', applies_to: 'family', min_ils: 450, max_ils: 900, avg_ils: 650,
    source_url: 'https://www.midrag.co.il/Content/Price/579',
    notes_he: 'כולל החלפת שמן, פילטר שמן, בדיקת בלמים ומערכות. עלות גבוהה יותר ביבואן מורשה.',
  },
  {
    repair_key: 'service_10k', repair_name_he: 'טיפול 10,000 ק"מ', repair_name_en: '10,000 km service',
    category: 'service', applies_to: 'suv', min_ils: 650, max_ils: 1400, avg_ils: 950,
    source_url: 'https://www.midrag.co.il/Content/Price/579',
    notes_he: 'SUV ורכבי שטח — נפח שמן גדול יותר, חלקים יקרים יותר.',
  },
  {
    repair_key: 'service_15k', repair_name_he: 'טיפול 15,000 ק"מ', repair_name_en: '15,000 km service',
    category: 'service', applies_to: 'family', min_ils: 600, max_ils: 1200, avg_ils: 850,
    source_url: 'https://www.midrag.co.il/Content/Price/2251',
    notes_he: 'כולל החלפת פילטר אוויר, בדיקת בלמים, כיוון פרונט. רכבי האיברידיים עשויים לעלות פחות.',
  },
  {
    repair_key: 'service_15k', repair_name_he: 'טיפול 15,000 ק"מ', repair_name_en: '15,000 km service',
    category: 'service', applies_to: 'suv', min_ils: 900, max_ils: 2000, avg_ils: 1300,
    source_url: 'https://www.midrag.co.il/Content/Price/2251',
    notes_he: 'SUV — כולל נפח שמן גדול יותר, לרוב גם פילטרים נוספים.',
  },
  {
    repair_key: 'pre_purchase_inspection', repair_name_he: 'בדיקה לפני קנייה', repair_name_en: 'Pre-purchase inspection',
    category: 'service', applies_to: 'all', min_ils: 300, max_ils: 700, avg_ils: 450,
    source_url: 'https://www.midrag.co.il/Content/Price/10949',
    notes_he: 'בדיקה במוסך עצמאי. בדיקה במרכז בדיקות מורשה: ₪500-1,200.',
  },

  // ─── Engine ───────────────────────────────────────────────────────────────
  {
    repair_key: 'oil_change', repair_name_he: 'החלפת שמן מנוע', repair_name_en: 'Engine oil change',
    category: 'engine', applies_to: 'family', min_ils: 180, max_ils: 500, avg_ils: 320,
    source_url: 'https://www.midrag.co.il/Content/Price/14839',
    notes_he: 'שמן + פילטר. שמן סינתטי עולה יותר אך מחזיק יותר. ₪40-90 לליטר, רכב רגיל צורך 4-5 ליטר.',
  },
  {
    repair_key: 'oil_change', repair_name_he: 'החלפת שמן מנוע', repair_name_en: 'Engine oil change',
    category: 'engine', applies_to: 'suv', min_ils: 280, max_ils: 700, avg_ils: 450,
    source_url: 'https://www.midrag.co.il/Content/Price/14839',
    notes_he: 'SUV — נפח שמן גדול יותר (5-7 ליטר), לרוב שמן סינתטי נדרש.',
  },
  {
    repair_key: 'timing_belt', repair_name_he: 'החלפת רצועת תזמון', repair_name_en: 'Timing belt replacement',
    category: 'engine', applies_to: 'family', min_ils: 1100, max_ils: 2000, avg_ils: 1500,
    source_url: 'https://www.midrag.co.il/Content/Price/574',
    notes_he: 'כולל פומפת מים ורולר מהדק. חשוב להחליף כל 60-80 אלף ק"מ. חריגה עלולה לגרום נזק חמור.',
  },
  {
    repair_key: 'timing_belt', repair_name_he: 'החלפת רצועת תזמון', repair_name_en: 'Timing belt replacement',
    category: 'engine', applies_to: 'suv', min_ils: 1400, max_ils: 2800, avg_ils: 2000,
    source_url: 'https://www.midrag.co.il/Content/Price/574',
    notes_he: 'SUV — נגישות קשה יותר למנוע, עלות עבודה גבוהה יותר.',
  },
  {
    repair_key: 'catalytic_converter', repair_name_he: 'ממיר קטליטי', repair_name_en: 'Catalytic converter',
    category: 'engine', applies_to: 'family', min_ils: 1400, max_ils: 3500, avg_ils: 1750,
    source_url: 'https://www.midrag.co.il/Content/Price/9326',
    notes_he: 'שחזור: ₪1,400-1,800. לא מקורי: ₪1,500-2,500. מקורי (יצרן): ₪4,000-7,000.',
  },
  {
    repair_key: 'oil_leak_repair', repair_name_he: 'תיקון נזילת שמן', repair_name_en: 'Oil leak repair',
    category: 'engine', applies_to: 'all', min_ils: 300, max_ils: 3000, avg_ils: 900,
    source_url: 'https://www.midrag.co.il/Content/Price/11891',
    notes_he: 'תלוי במקור הנזילה: פקק ₪100-150, אטם ₪300-600, אטם גלגלת ₪2,000-3,000.',
  },
  {
    repair_key: 'spark_plugs', repair_name_he: 'החלפת מצתים', repair_name_en: 'Spark plug replacement',
    category: 'engine', applies_to: 'all', min_ils: 200, max_ils: 1200, avg_ils: 500,
    source_url: 'https://www.midrag.co.il/Content/Price/574',
    notes_he: 'מצתים רגילים (45K ק"מ): ₪200-300. מצתי אירידיום (100K ק"מ): ₪500-1,200. כולל עבודה.',
  },
  {
    repair_key: 'fuel_injectors', repair_name_he: 'החלפת מזרקים', repair_name_en: 'Fuel injector replacement',
    category: 'engine', applies_to: 'family', min_ils: 1500, max_ils: 2500, avg_ils: 2000,
    source_url: 'https://www.midrag.co.il/Content/Price/14363',
    notes_he: 'חלקים + עבודה. ניקוי מזרקים: ₪250-400. עבודה: ₪300/שעה, 3-5 שעות.',
  },

  // ─── Brakes ───────────────────────────────────────────────────────────────
  {
    repair_key: 'brake_pads_front', repair_name_he: 'בלמים קדמיים (רפידות + צלחות)', repair_name_en: 'Front brake pads + discs',
    category: 'brakes', applies_to: 'family', min_ils: 500, max_ils: 800, avg_ils: 650,
    source_url: 'https://www.midrag.co.il/Content/Price/11906',
    notes_he: 'רפידות בלבד: ₪150-450. צלחת: ₪90-450. ריחוק (חידוד) צלחת: ₪60-150.',
  },
  {
    repair_key: 'brake_pads_front', repair_name_he: 'בלמים קדמיים (רפידות + צלחות)', repair_name_en: 'Front brake pads + discs',
    category: 'brakes', applies_to: 'suv', min_ils: 700, max_ils: 1400, avg_ils: 1000,
    source_url: 'https://www.midrag.co.il/Content/Price/11906',
    notes_he: 'SUV וג\'יפים — חלקים גדולים יותר ויקרים יותר.',
  },
  {
    repair_key: 'brake_pads_rear', repair_name_he: 'בלמים אחוריים (רפידות + צלחות)', repair_name_en: 'Rear brake pads + discs',
    category: 'brakes', applies_to: 'family', min_ils: 500, max_ils: 900, avg_ils: 700,
    source_url: 'https://www.midrag.co.il/Content/Price/11906',
    notes_he: 'רכבים ישנים עם נעלי בלם: +₪300-500. רכב מעל 15 שנה — דרוש אישור בדיקה (+₪150).',
  },

  // ─── Suspension / Steering ─────────────────────────────────────────────────
  {
    repair_key: 'wheel_alignment', repair_name_he: 'כיוון פרונט', repair_name_en: 'Wheel alignment',
    category: 'suspension', applies_to: 'family', min_ils: 150, max_ils: 400, avg_ils: 250,
    source_url: 'https://www.midrag.co.il/Content/Price/11822',
    notes_he: 'כיוון 2 גלגלים. כיוון 4 גלגלים (כולל סרן אחורי): ₪350-700.',
  },
  {
    repair_key: 'wheel_alignment', repair_name_he: 'כיוון פרונט', repair_name_en: 'Wheel alignment',
    category: 'suspension', applies_to: 'suv', min_ils: 250, max_ils: 600, avg_ils: 400,
    source_url: 'https://www.midrag.co.il/Content/Price/11822',
    notes_he: 'SUV ורכבי שטח. כיוון סרן אחורי: ₪500-800.',
  },
  {
    repair_key: 'steering_rack', repair_name_he: 'מסרק הגה', repair_name_en: 'Steering rack',
    category: 'suspension', applies_to: 'family', min_ils: 800, max_ils: 3000, avg_ils: 1500,
    source_url: 'https://www.midrag.co.il/Content/Price/11808',
    notes_he: 'יד שנייה: ₪800-1,200. שחזור: ₪1,200-1,800. חדש: ₪2,200-3,000. אחריות 3 חודשים.',
  },

  // ─── Electrical ───────────────────────────────────────────────────────────
  {
    repair_key: 'battery', repair_name_he: 'החלפת מצבר', repair_name_en: 'Battery replacement',
    category: 'electrical', applies_to: 'family', min_ils: 500, max_ils: 1000, avg_ils: 700,
    source_url: 'https://www.midrag.co.il/Content/Price/574',
    notes_he: 'מצבר סטנדרטי. מצבר Start-Stop: ₪1,000-1,900. כולל התקנה.',
  },
  {
    repair_key: 'battery', repair_name_he: 'החלפת מצבר', repair_name_en: 'Battery replacement',
    category: 'electrical', applies_to: 'suv', min_ils: 700, max_ils: 1500, avg_ils: 1000,
    source_url: 'https://www.midrag.co.il/Content/Price/574',
    notes_he: 'SUV ורכבים גדולים — מצבר גדול יותר. Start-Stop: עד ₪2,200.',
  },

  // ─── Filters ──────────────────────────────────────────────────────────────
  {
    repair_key: 'air_filter', repair_name_he: 'פילטר אוויר', repair_name_en: 'Air filter replacement',
    category: 'engine', applies_to: 'all', min_ils: 150, max_ils: 400, avg_ils: 250,
    source_url: 'https://www.midrag.co.il/Content/Price/574',
    notes_he: 'חלק בלבד: ₪50-200. כולל התקנה: ₪150-400. פילטר ספורט (K&N): ₪400-800.',
  },
];

let inserted = 0, skipped = 0;
for (const row of REPAIRS) {
  const { error } = await db.from('repair_costs').upsert(row, { onConflict: 'repair_key,applies_to', ignoreDuplicates: false });
  if (error) {
    console.error('ERROR', row.repair_key, row.applies_to, error.message);
  } else {
    inserted++;
    console.log(`OK  ${row.repair_key} [${row.applies_to}]`);
  }
}
console.log(`\nDone. ${inserted} rows upserted.`);
