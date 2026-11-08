/**
 * car_trims rows scraped from Hebrew sources (auto.co.il etc.) store free-text Hebrew in
 * fields that the UI expects as canonical keys (engine_type / transmission / drive / seats),
 * and Hebrew trim names such as "2.0 ל' טורבו, אוט', 4x4". These helpers normalise the enum
 * fields to the keys the translation tables use, and render trim names in English for
 * carissues.net. The raw name stays the identity (selection, URLs); only display changes.
 */

const HEB = /[֐-׿]/;

export function hasHebrew(s: string | null | undefined): boolean {
  return !!s && HEB.test(s);
}

export function normalizeEngineType(raw: unknown): string | undefined {
  if (raw == null || raw === '') return undefined;
  const v = String(raw).trim();
  const l = v.toLowerCase();
  if (['petrol', 'hybrid', 'phev', 'electric', 'diesel'].includes(l)) return l;
  if (l === 'gasoline' || l === 'gas') return 'petrol';
  if (/תקע|פלאג|plug/i.test(v)) return 'phev';
  if (/היברידי|הייבריד|hybrid/i.test(v)) return 'hybrid';
  if (/חשמלי|electric|ev\b/i.test(v)) return 'electric';
  if (/דיזל|diesel/i.test(v)) return 'diesel';
  if (/בנזין|petrol|gasoline/i.test(v)) return 'petrol';
  return v;
}

export function normalizeTransmission(raw: unknown): string | undefined {
  if (raw == null || raw === '') return undefined;
  const v = String(raw).trim();
  const l = v.toLowerCase();
  if (['manual', 'automatic', 'cvt', 'dct'].includes(l)) return l;
  if (/^dct|דו.?מצמד/i.test(v)) return 'dct';
  if (/^cvt|רציפה/i.test(v)) return 'cvt';
  if (/ידני|manual/i.test(v)) return 'manual';
  if (/^at\b|אוטומט|automatic/i.test(v)) return 'automatic';
  return v;
}

export function normalizeDrive(raw: unknown): string | undefined {
  if (raw == null || raw === '') return undefined;
  const v = String(raw).trim();
  const l = v.toLowerCase();
  if (['fwd', 'rwd', 'awd'].includes(l)) return l;
  if (l === '4wd' || /4x4|4×4|כפולה|4wd|awd/i.test(v)) return 'awd';
  if (/אחורי/.test(v)) return 'rwd';
  if (/קדמי/.test(v)) return 'fwd';
  return v;
}

export function normalizeSeats(raw: unknown): string | undefined {
  if (raw == null || raw === '') return undefined;
  const v = String(raw).trim();
  const l = v.toLowerCase();
  if (['fabric', 'leatherette', 'leather', 'vegan'].includes(l)) return l;
  if (/דמוי/.test(v)) return 'leatherette';
  if (/עור/.test(v)) return 'leather';
  if (/בד/.test(v)) return 'fabric';
  return v;
}

// Ordered: multi-word phrases before their single-word parts.
const NAME_PHRASES: [RegExp, string][] = [
  [/\(\s*מ\.\s*פנים\s*\)/g, '(Facelift)'],
  [/\(\s*מתיחת\s+פנים\s*\)/g, '(Facelift)'],
  [/מתיחת\s+פנים/g, 'Facelift'],
  [/\(\s*דור\s+חדש\s*\)/g, '(New Gen)'],
  [/\(\s*דור\s+קודם\s*\)/g, '(Prev. Gen)'],
  [/פלאג[\s-]*אין\s+(?:הייבריד|היברידי)/g, 'Plug-in Hybrid'],
  [/פלאג[\s-]*אין/g, 'Plug-in'],
  [/היברידי[\s-]+מתון/g, 'Mild Hybrid'],
  [/טורבו\s+(?:היברידי|הייבריד)/g, 'Turbo Hybrid'],
  [/היברידי\s+תקע/g, 'Plug-in Hybrid'],
  [/הובלת\s+נוסעים/g, 'Passenger'],
  [/תלתן[\s-]+ירוק/g, 'Quadrifoglio'],
  [/(\d+)\s*-?\s*מושבים/g, '$1 Seats'],
  [/(\d+)\s*מק'/g, '$1 Seats'],
  [/(\d+)\s*דל'/g, '$1-Door'],
  [/(\d+)\s*דלתות/g, '$1-Door'],
  [/(\d+)\s*נוסעים/g, '$1 Passengers'],
  [/כ"ס/g, 'hp'],
  [/(\d(?:\.\d+)?)\s*ליטר/g, '$1L'],
  [/(\d(?:\.\d+)?)\s*ל'/g, '$1L'],
  [/(\d(?:\.\d+)?)\s*ט'/g, '$1T'],
];

const NAME_WORDS: Record<string, string> = {
  "אוט'": 'Auto',
  'אוטומטי': 'Auto',
  'ידנית': 'Manual',
  'ידני': 'Manual',
  'טורבו': 'Turbo',
  'היברידי': 'Hybrid',
  'הייבריד': 'Hybrid',
  'חשמלי': 'Electric',
  'חשמלית': 'Electric',
  'דיזל': 'Diesel',
  'בנזין': 'Petrol',
  'ספורטבק': 'Sportback',
  'קופה': 'Coupe',
  'סדאן': 'Sedan',
  "האצ'בק": 'Hatchback',
  'קבריולה': 'Cabriolet',
  'סטיישן': 'Wagon',
  'קומבי': 'Combi',
  'קוואטרו': 'quattro',
  'ספורט': 'Sport',
  'אקטיב': 'Active',
  'מולטיטרוניק': 'Multitronic',
  'אוקטה': 'Octa',
  'סטינגריי': 'Stingray',
  'טיטניום': 'Titanium',
  'טורר': 'Tourer',
  'אדוונס': 'Advance',
  'סיוויק': 'Civic',
  'סטפוויי': 'Stepway',
  'סטייל': 'Style',
  'אלגנס': 'Elegance',
  'ואן': 'Van',
  'מסחרי': 'Commercial',
  'קצר': 'Short',
  'ארוך': 'Long',
  'סגור': 'Closed',
  'מלא': 'Full',
  'תלתן': 'Quadrifoglio',
  'ירוק': 'Green',
  'מתון': 'Mild',
  'ליטר': 'L',
};

/** English display name for a trim; non-Hebrew names are returned unchanged. */
export function trimNameEn(name: string): string {
  if (!hasHebrew(name)) return name;
  let s = name;
  for (const [re, rep] of NAME_PHRASES) s = s.replace(re, rep);
  s = s.replace(/[֐-׿][֐-׿'"׳״-]*/g, (w) => {
    if (NAME_WORDS[w]) return NAME_WORDS[w];
    const bare = w.replace(/['"׳״]+$/, '');
    return NAME_WORDS[bare] ?? NAME_WORDS[`${bare}'`] ?? '';
  });
  // Tidy separators left behind ("4x4 ,LT", empty slots, double spaces).
  s = s
    .replace(/\s+,/g, ',')
    .replace(/,(?=\S)/g, ', ')
    .replace(/(,\s*){2,}/g, ', ')
    .replace(/\(\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,]+|[\s,]+$/g, '');
  return s || name;
}

export function displayTrimName(name: string, locale: string): string {
  return locale === 'en' ? trimNameEn(name) : name;
}
