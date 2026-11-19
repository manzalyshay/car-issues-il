/**
 * Car repair prices reported on Midrag (midrag.co.il): what Midrag members say they actually
 * paid, incl. VAT. Collected by hand from Midrag's public price-list pages and checked against
 * the live pages on 2026-11-19; each page's own "updated" date (Jan-Jul 2025) is kept below.
 *
 * - avg / min / max are the average, lowest and highest payment Midrag shows. The range is the
 *   extremes reported, not necessarily the usual price. Midrag does not publish sample sizes.
 * - `spread` is Midrag's own distribution line for that page (Hebrew only).
 * - Midrag's price pages carry a copyright notice on reuse without written permission. The
 *   site owner chose to publish with attribution and links while asking Midrag for permission
 *   (2026-11-19). If Midrag objects, remove this file's use on /repairs.
 */
export interface MidragPrice {
  key: string;
  he: string;
  en: string;
  group: 'service' | 'engine' | 'ac' | 'roadside' | 'body' | 'brand';
  avg: number;
  min: number;
  max: number;
  /** Midrag's distribution line, Hebrew */
  spread: string;
  /** Midrag page "updated" date, YYYY-MM-DD */
  updated: string;
  url: string;
}

export const MIDRAG_CHECKED_ON = '2026-11-19';

export const MIDRAG_PRICES: readonly MidragPrice[] = [
  { key: 'periodic_service', he: 'טיפול תקופתי לרכב פרטי (שמנים ופילטרים)', en: 'Periodic service (oil & filters)', group: 'service', avg: 744, min: 605, max: 997, spread: '30% מהמקרים 600 עד 650 ₪', updated: '2025-07-08', url: 'https://www.midrag.co.il/Content/PriceList/1278381' },
  { key: 'full_service', he: 'תיקון וטיפול תקופתי כולל', en: 'Full periodic service & repairs', group: 'service', avg: 1527, min: 880, max: 2358, spread: '87% מהמקרים פחות מ-2,000 ₪', updated: '2025-07-08', url: 'https://www.midrag.co.il/Content/PriceList/1785256' },
  { key: 'brake_pads_front', he: 'החלפת רפידות בלמים קדמיים', en: 'Front brake pads', group: 'service', avg: 1190, min: 772, max: 1870, spread: '88% מהמקרים פחות מ-1,500 ₪', updated: '2025-07-06', url: 'https://www.midrag.co.il/Content/PriceList/391642' },
  { key: 'brake_discs_pads_front', he: 'החלפת צלחות ורפידות בלמים קדמיים', en: 'Front brake discs & pads', group: 'service', avg: 1193, min: 914, max: 1529, spread: '67% מהמקרים שילמו מעל 1,100 ₪', updated: '2025-06-12', url: 'https://www.midrag.co.il/Content/PriceList/392726' },
  { key: 'timing_belt', he: 'החלפת רצועת טיימינג', en: 'Timing belt', group: 'engine', avg: 2236, min: 1287, max: 3949, spread: '30% מהמקרים 1,501 עד 1,800 ₪', updated: '2025-06-09', url: 'https://www.midrag.co.il/Content/PriceList/26304' },
  { key: 'timing_belt_water_pump', he: 'החלפת רצועת טיימינג ומשאבת מים', en: 'Timing belt & water pump', group: 'engine', avg: 2309, min: 1911, max: 3080, spread: '60% מהמקרים שילמו מעל 2,100 ₪', updated: '2025-06-29', url: 'https://www.midrag.co.il/Content/PriceList/57371' },
  { key: 'timing_chain', he: 'החלפת שרשרת טיימינג', en: 'Timing chain', group: 'engine', avg: 3859, min: 2750, max: 5720, spread: '63% מהמקרים שילמו מעל 3,100 ₪', updated: '2025-06-10', url: 'https://www.midrag.co.il/Content/PriceList/11777' },
  { key: 'water_pump', he: 'החלפת משאבת מים', en: 'Water pump', group: 'engine', avg: 1550, min: 825, max: 3375, spread: '70% מהמקרים שילמו מעל 1,100 ₪', updated: '2025-06-24', url: 'https://www.midrag.co.il/Content/PriceList/63710' },
  { key: 'alternator', he: 'החלפת אלטרנטור', en: 'Alternator', group: 'engine', avg: 1492, min: 990, max: 2455, spread: '73% מהמקרים שילמו מעל 1,100 ₪', updated: '2025-07-01', url: 'https://www.midrag.co.il/Content/PriceList/10427' },
  { key: 'radiator', he: 'החלפת רדיאטור', en: 'Radiator', group: 'engine', avg: 1925, min: 935, max: 3300, spread: '73% מהמקרים שילמו מעל 1,500 ₪', updated: '2025-07-09', url: 'https://www.midrag.co.il/Content/PriceList/223931' },
  { key: 'engine_mount', he: 'החלפת תושבת מנוע', en: 'Engine mount', group: 'engine', avg: 952, min: 644, max: 1485, spread: '63% מהמקרים שילמו מעל 800 ₪', updated: '2025-07-03', url: 'https://www.midrag.co.il/Content/PriceList/9704' },
  { key: 'fuel_pump', he: 'החלפת משאבת דלק', en: 'Fuel pump', group: 'engine', avg: 1447, min: 966, max: 1967, spread: 'שליש מהמקרים 900 עד 1,100 ₪, שליש 1,501 עד 1,700 ₪', updated: '2025-06-15', url: 'https://www.midrag.co.il/Content/PriceList/9846' },
  { key: 'ignition_coil', he: 'החלפת סליל הצתה', en: 'Ignition coil', group: 'engine', avg: 655, min: 490, max: 1312, spread: '50% מהמקרים שילמו מעל 600 ₪', updated: '2025-07-14', url: 'https://www.midrag.co.il/Content/PriceList/10664' },
  { key: 'spark_plugs_coil', he: 'החלפת פלאגים וסליל הצתה', en: 'Spark plugs & ignition coil', group: 'engine', avg: 1126, min: 531, max: 1762, spread: '37% מהמקרים 1,101 עד 1,300 ₪', updated: '2025-07-09', url: 'https://www.midrag.co.il/Content/PriceList/184410' },
  { key: 'ac_gas', he: 'מילוי גז במזגן הרכב', en: 'A/C gas refill', group: 'ac', avg: 354, min: 257, max: 644, spread: '40% מהמקרים 250 עד 300 ₪', updated: '2025-07-04', url: 'https://www.midrag.co.il/Content/PriceList/549384' },
  { key: 'ac_compressor', he: 'החלפת מדחס מזגן', en: 'A/C compressor', group: 'ac', avg: 2619, min: 1802, max: 3245, spread: '96% מהמקרים פחות מ-3,200 ₪', updated: '2025-07-10', url: 'https://www.midrag.co.il/Content/PriceList/483004' },
  { key: 'battery_install', he: 'התקנת מצבר חדש', en: 'New battery, installed', group: 'roadside', avg: 672, min: 605, max: 803, spread: '80% מהמקרים פחות מ-700 ₪', updated: '2025-07-03', url: 'https://www.midrag.co.il/Content/PriceList/897025' },
  { key: 'puncture_mobile', he: 'תיקון פנצ׳ר (מוסך נייד)', en: 'Puncture repair (mobile)', group: 'roadside', avg: 317, min: 264, max: 385, spread: '50% מהמקרים 311 עד 360 ₪', updated: '2025-06-29', url: 'https://www.midrag.co.il/Content/PriceList/680910' },
  { key: 'puncture_wheel', he: 'תיקון פנצ׳ר בגלגל', en: 'Puncture repair (wheel)', group: 'roadside', avg: 338, min: 165, max: 418, spread: '36% מהמקרים שילמו מעל 360 ₪', updated: '2025-02-12', url: 'https://www.midrag.co.il/Content/PriceList/707261' },
  { key: 'puncture_home', he: 'תיקון פנצ׳ר בבית הלקוח', en: 'Puncture repair at home', group: 'roadside', avg: 387, min: 321, max: 515, spread: '50% מהמקרים 320 עד 370 ₪', updated: '2025-01-14', url: 'https://www.midrag.co.il/Content/PriceList/1520571' },
  { key: 'rear_bumper_repair', he: 'תיקון פגוש אחורי', en: 'Rear bumper repair', group: 'body', avg: 884, min: 454, max: 1544, spread: '67% מהמקרים שילמו מעל 600 ₪', updated: '2025-07-09', url: 'https://www.midrag.co.il/Content/PriceList/476156' },
  { key: 'bumper_paint', he: 'צביעת פגוש', en: 'Bumper paint', group: 'body', avg: 971, min: 550, max: 1650, spread: '74% מהמקרים שילמו מעל 700 ₪', updated: '2025-06-24', url: 'https://www.midrag.co.il/Content/PriceList/476993' },
  { key: 'door_paint', he: 'צביעת דלת', en: 'Door paint', group: 'body', avg: 1387, min: 770, max: 2090, spread: '33% מהמקרים 1,101 עד 1,300 ₪', updated: '2025-06-18', url: 'https://www.midrag.co.il/Content/PriceList/594205' },
  { key: 'clutch_toyota', he: 'החלפת קלאץ׳ (טויוטה בלבד)', en: 'Clutch replacement (Toyota only)', group: 'brand', avg: 2677, min: 1210, max: 4121, spread: '40% מהמקרים 2,401 עד 2,800 ₪', updated: '2025-06-24', url: 'https://www.midrag.co.il/Content/PriceList/690771' },
  { key: 'service_10k_honda', he: 'טיפול 10,000 (הונדה בלבד)', en: '10,000 km service (Honda only)', group: 'brand', avg: 934, min: 528, max: 1802, spread: '33% מהמקרים 701 עד 900 ₪', updated: '2025-07-01', url: 'https://www.midrag.co.il/Content/PriceList/66618' },
];

/** Averages of rates garages publish themselves on Midrag (not prices customers paid). */
export const MIDRAG_GARAGE_RATES: readonly { he: string; en: string; min: number; max: number }[] = [
  { he: 'שעת עבודה במוסך', en: 'Garage labor, per hour', min: 250, max: 337 },
  { he: 'בדיקת רכב לפני טסט (ללא תיקון)', en: 'Pre-inspection check (no repairs)', min: 158, max: 232 },
  { he: 'בדיקת רכב משפחתי לפני קנייה', en: 'Pre-purchase inspection, family car', min: 371, max: 546 },
  { he: 'בדיקת מחשב רכב (ללא תיקון)', en: 'Car computer diagnostics (no repairs)', min: 183, max: 252 },
];

export const MIDRAG_GROUPS: readonly { key: MidragPrice['group']; he: string; en: string; note?: { he: string; en: string } }[] = [
  { key: 'service', he: 'טיפולים ובלמים', en: 'Service & brakes', note: { he: 'רפידות לבד מול צלחות ורפידות הם שני דפים נפרדים במידרג, מדיווחים שונים, ולכן אין להשוות ביניהם ישירות.', en: 'Pads only vs. discs & pads come from separate Midrag pages with different reports - not directly comparable.' } },
  { key: 'engine', he: 'מנוע וחלקים', en: 'Engine & parts' },
  { key: 'ac', he: 'מיזוג אוויר', en: 'Air conditioning' },
  { key: 'roadside', he: 'מצבר ופנצ׳רים', en: 'Battery & punctures', note: { he: 'תיקון פנצ׳ר בלבד, לא החלפת צמיג.', en: 'Puncture repair only, not a tyre replacement.' } },
  { key: 'body', he: 'פחחות וצבע', en: 'Body & paint' },
  { key: 'brand', he: 'לפי יצרן', en: 'Brand-specific', note: { he: 'מחירים מדפים של יצרן אחד בלבד.', en: 'Prices from single-brand pages only.' } },
];
