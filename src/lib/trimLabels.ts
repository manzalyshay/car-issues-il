/**
 * Display labels for Israeli trims (car_trims) on non-Hebrew pages.
 *
 * Trim names come from Israeli price lists and are often Hebrew ("2.0 ל' היברידי, אוט',
 * Elegance"), and drive/engine/transmission are sometimes stored as raw Hebrew text
 * ("הנעה קדמית", "DCT 7 הילוכים") instead of keys. English and Russian pages must never
 * show Hebrew, so:
 *   - trimNameEn() translates a trim name word by word from a fixed dictionary that
 *     covers every Hebrew word in the data (tests/trimLabels.test.mjs), and strips anything
 *     left over as a last resort;
 *   - driveKey() / engineKey() / transmissionKey() map raw values to the translation keys.
 * The Hebrew site keeps the original names and values. URLs keep using the original name
 * (toTrimSlug(trim.name)), so no trim URL changes.
 */

const HEBREW = /[֐-׿]/;
export const hasHebrew = (s: string | null | undefined): boolean => !!s && HEBREW.test(s);

/** Multi-word phrases first (longest first), then single words. Order matters. */
const PHRASES: [RegExp, string][] = [
  [/פלאג[- ]?אין[- ]?(?:הייבריד|היברידי)/g, 'Plug-in Hybrid'],
  [/פלאג[- ]?אין/g, 'Plug-in'],
  [/(?:היברידי|הייבריד)[- ]מתון/g, 'Mild Hybrid'],
  [/(?:היברידי|הייבריד)[- ]מלא/g, 'Full Hybrid'],
  [/מ\.\s*פנים/g, 'Facelift'],
  [/מתיחת[- ]פנים/g, 'Facelift'],
  [/דור[- ]חדש/g, 'New Generation'],
  [/דור[- ]קודם/g, 'Previous Generation'],
  [/הובלת[- ]נוסעים/g, 'Passenger'],
  [/מסחרי[- ]סגור/g, 'Panel Van'],
  [/תלתן[- ]ירוק/g, 'Quadrifoglio'],
  [/(\d+)[- ]?מושבים/g, '$1-Seat'],
  [/(\d+)\s*מק'/g, '$1 Seats'],
  [/(\d+)\s*(?:דל'|דלתות)/g, '$1-Door'],
  [/(\d+(?:\.\d+)?)\s*ט'/g, '$1 Turbo'],
  [/(\d+(?:\.\d+)?)\s*(?:ל'|ליטר)/g, '$1 L'],
  [/(\d+)\s*כ"ס/g, '$1 hp'],
];

const WORDS: Record<string, string> = {
  "אוט'": 'Auto', 'טורבו': 'Turbo', 'היברידי': 'Hybrid', 'הייבריד': 'Hybrid', 'מתון': 'Mild',
  'חשמלי': 'Electric', 'חשמלית': 'Electric', 'דיזל': 'Diesel', 'ספורטבק': 'Sportback',
  'קופה': 'Coupe', 'סדאן': 'Sedan', 'ידנית': 'Manual', 'ידני': 'Manual', 'ספורט': 'Sport',
  'קבריולה': 'Cabriolet', "האצ'בק": 'Hatchback', 'קוואטרו': 'quattro', 'סטיישן': 'Estate',
  'סטינגריי': 'Stingray', 'מולטיטרוניק': 'Multitronic', 'קומבי': 'Kombi', 'אוקטה': 'Octa',
  'ארוך': 'Long', 'קצר': 'Short', 'אקטיב': 'Active', 'סטפוויי': 'Stepway', 'ואן': 'Van',
  'טורר': 'Tourer', 'טיטניום': 'Titanium', 'מסחרי': 'Commercial', 'אלגנס': 'Elegance',
  'סטייל': 'Style', 'אדוונס': 'Advance', 'סיוויק': 'Civic', 'מלא': 'Full', 'חדש': 'New',
  'קודם': 'Previous', 'דור': 'Generation', 'נוסעים': 'Passenger', 'סגור': 'Closed',
  'כ"ס': 'hp', "ל'": 'L', 'ליטר': 'L', "מק'": 'Seats', "דל'": 'Door', 'דלתות': 'Doors', 'מושבים': 'Seats',
  'פנים': '', 'מתיחת': 'Facelift', 'תלתן': 'Quadrifoglio', 'ירוק': '',
};

/** English (Latin) name for a trim. Never contains Hebrew. */
export function trimNameEn(name: string): string {
  if (!hasHebrew(name)) return name;
  let s = name;
  for (const [re, en] of PHRASES) s = s.replace(re, en);
  // Each remaining Hebrew word: its dictionary translation; a word missing from the
  // dictionary is dropped (never shown in Hebrew). tests/trimLabels.test.mjs keeps the
  // dictionary complete for the words in the data.
  s = s.replace(/[֐-׿][֐-׿'"׳״]*/g, (w) => WORDS[w] ?? WORDS[w.replace(/['"׳״]+$/, '')] ?? '');
  s = s.replace(/[֐-׿]/g, '');
  return s
    .replace(/\(\s*\)/g, '')
    .replace(/\s*,[\s,]*/g, ', ')
    .replace(/^[\s,-]+|[\s,-]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Trim name in the page language: the original on the Hebrew site, translated elsewhere. */
export function trimDisplayName(name: string, locale: string): string {
  return locale === 'he' ? name : trimNameEn(name);
}

type DriveKey = 'fwd' | 'rwd' | 'awd';
export function driveKey(raw: string | null | undefined): DriveKey | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (v === 'fwd' || /קדמי/.test(v)) return 'fwd';
  if (v === 'rwd' || /אחורי/.test(v)) return 'rwd';
  if (v === 'awd' || v === '4wd' || v === '4x4' || /כפולה|4x4|4×4/.test(v)) return 'awd';
  return null;
}

type EngineKey = 'petrol' | 'diesel' | 'hybrid' | 'phev' | 'electric';
export function engineKey(raw: string | null | undefined): EngineKey | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (v === 'phev' || /פלאג|plug/.test(v) || /היברידי תקע/.test(v)) return 'phev';
  if (v === 'hybrid' || /היברידי|הייבריד/.test(v)) return 'hybrid';
  if (v === 'electric' || /חשמלי/.test(v)) return 'electric';
  if (v === 'diesel' || /דיזל/.test(v)) return 'diesel';
  if (v === 'petrol' || v === 'gasoline' || /בנזין/.test(v)) return 'petrol';
  return null;
}

type TransmissionKey = 'automatic' | 'manual' | 'cvt' | 'dct';
export function transmissionKey(raw: string | null | undefined): TransmissionKey | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (/dct|dsg/.test(v)) return 'dct';
  if (/cvt/.test(v)) return 'cvt';
  if (v === 'manual' || /ידני/.test(v)) return 'manual';
  if (v === 'automatic' || /^at\b/.test(v) || /אוטומט/.test(v)) return 'automatic';
  return null;
}

/** Gear count from a raw transmission value ("DCT 7 הילוכים" -> 7). */
export function transmissionGears(raw: string | null | undefined): number | null {
  const m = raw?.match(/(\d+)\s*(?:הילוכים|speed|-speed)/i);
  return m ? Number(m[1]) : null;
}

/**
 * Label for a raw trim value. Hebrew site: the raw Hebrew text when that's what is stored
 * (it may say more than the key, e.g. "בנזין V6 טורבו"), else the translated key. Other
 * languages: the translated key, else the raw value only if it has no Hebrew, else null
 * (the caller hides the row rather than show Hebrew).
 */
export function trimValueLabel(
  raw: string | null | undefined,
  key: string | null,
  labels: Record<string, string>,
  locale: string,
  extra?: string,
): string | null {
  if (!raw) return null;
  if (locale === 'he' && hasHebrew(raw)) return raw;
  const base = key && labels[key] ? labels[key] : hasHebrew(raw) ? null : raw;
  if (!base) return null;
  return extra ? `${base} ${extra}` : base;
}

/**
 * Short button labels for auto.co.il version names. Those names are full spec strings
 * ("(מתיחת פנים) HEV, אוט', 1.6 ל' היברידי, EX"), so a selector of five versions is hard to
 * scan. The short form keeps what tells versions apart: trim, powertrain, facelift
 * ("EX · היברידי · מתיחת פנים"). If two labels in the list still collide, engine size and
 * then drive are added; failing that the full name is used. Names that are not
 * auto.co.il spec strings (e.g. "LX", "אלגנס") pass through unchanged.
 */
export function trimShortLabels(names: string[], locale: string): string[] {
  const he = locale === 'he';
  const parsed = names.map((name) => {
    const facelift = /\(\s*(?:מתיחת[- ]פנים|מ\.\s*פנים)\s*\)/.test(name);
    const body = name.replace(/\(\s*(?:מתיחת[- ]פנים|מ\.\s*פנים)\s*\)/g, '').trim();
    const parts = body.split(',').map((p) => p.trim()).filter(Boolean);
    const DRIVE = /^(4x4|4x2|2x4|awd|rwd|fwd|\d+x\d+)$/i;
    const drive = parts.length > 1 && DRIVE.test(parts[parts.length - 1]) ? parts.pop()! : null;
    const specLike = (p: string) => /ל'|ליטר|^(HEV|PHEV|MHEV|EV|BEV)$|^אוט'?$|^ידני|חשמלי|היברידי|הייבריד|פלאג|טורבו|דיזל|בנזין|^\d/.test(p);
    const last = parts[parts.length - 1] ?? '';
    const trim = parts.length > 1 && !specLike(last) ? last : null;
    const spec = parts.join(' ');
    const engine = /פלאג|PHEV/.test(spec) ? 'phev' : /מתון|MHEV/.test(spec) ? 'mild'
      : /היברידי|הייבריד|HEV/.test(spec) ? 'hybrid' : /חשמלי|\bEV\b/.test(spec) ? 'electric'
      : /דיזל/.test(spec) ? 'diesel' : null;
    const cc = spec.match(/(\d\.\d)\s*(?:ל'|ליטר|T\b)/)?.[1] ?? null;
    const isSpecString = parts.length > 1 || facelift || !!engine;
    return { name, facelift, trim, engine, cc, drive, isSpecString };
  });
  const ENGINE: Record<string, [string, string]> = {
    phev: ['פלאג-אין', 'Plug-in'], mild: ['היברידי מתון', 'Mild hybrid'], hybrid: ['היברידי', 'Hybrid'],
    electric: ['חשמלי', 'Electric'], diesel: ['דיזל', 'Diesel'],
  };
  const build = (p: (typeof parsed)[number], level: number): string => {
    if (!p.isSpecString) return he ? p.name : trimNameEn(p.name);
    const bits: string[] = [];
    if (p.trim) bits.push(he ? p.trim : trimNameEn(p.trim));
    if (p.engine) bits.push(ENGINE[p.engine][he ? 0 : 1]);
    if ((level >= 1 || (!p.trim && p.engine !== 'electric')) && p.cc) bits.push(he ? `${p.cc} ל'` : `${p.cc} L`);
    if (level >= 2 && p.drive) bits.push(p.drive);
    if (p.facelift) bits.push(he ? 'מתיחת פנים' : 'Facelift');
    return bits.length ? bits.join(' · ') : he ? p.name : trimNameEn(p.name);
  };
  const labels = parsed.map((p) => build(p, 0));
  for (let level = 1; level <= 3; level++) {
    const counts = new Map<string, number>();
    labels.forEach((l) => counts.set(l, (counts.get(l) ?? 0) + 1));
    labels.forEach((l, i) => {
      if ((counts.get(l) ?? 0) > 1) labels[i] = level === 3 ? (he ? parsed[i].name : trimNameEn(parsed[i].name)) : build(parsed[i], level);
    });
  }
  return labels;
}
