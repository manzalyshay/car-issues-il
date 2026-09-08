import { dbAll, dbFirst, dbRun } from './db';

const DATA_GOV_URL       = 'https://data.gov.il/api/3/action/datastore_search';
const RESOURCE_ID        = '053cea08-09bc-40ec-8f7a-156f0677aff3';
const EXTRA_RESOURCE     = '56063a99-8a3e-4ff4-912e-5966c0279bad';
const OWNERSHIP_RESOURCE = 'bb2355dc-9ec7-4f06-9c3f-3344672171da';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const HE_MAKE_MAP: Record<string, string> = {
  'קיה':         'kia',
  'יונדאי':      'hyundai',
  'טויוטה':      'toyota',
  'מזדה':        'mazda',
  'ניסאן':       'nissan',
  'הונדה':       'honda',
  'מיצובישי':    'mitsubishi',
  'סובארו':      'subaru',
  'סוזוקי':      'suzuki',
  'לקסוס':       'lexus',
  'פולקסווגן':   'volkswagen',
  'פולקס':       'volkswagen',
  'אאודי':       'audi',
  'סקודה':       'skoda',
  'סיאט':        'seat',
  'במוו':        'bmw',
  'מרצדס':       'mercedes',
  'אופל':        'opel',
  'פיג\'ו':      'peugeot',
  'פיגו':        'peugeot',
  'רנו':         'renault',
  'פיאט':        'fiat',
  'וולוו':       'volvo',
  'פורשה':       'porsche',
  'פורד':        'ford',
  'שברולט':      'chevrolet',
  'ג\'יפ':       'jeep',
  'ג׳יפ':        'jeep',
  'טסלה':        'tesla',
  'אלפא':        'alfa-romeo',
  'לנד':         'land-rover',
  'דאציה':       'dacia',
  'MG':          'mg',
  'בי.וואי.די':  'byd',
  'בייד':        'byd',
  'צ\'רי':       'chery',
  'גילי':        'geely',
  'קופרא':       'cupra',
  'קופרה':       'cupra',
};

export const EN_MAKE_MAP: Record<string, string> = {
  'ALFA ROMEO':    'alfa-romeo',
  'ALFA':          'alfa-romeo',
  'LAND ROVER':    'land-rover',
  'MERCEDES BENZ': 'mercedes',
  'MERCEDES-BENZ': 'mercedes',
  'MERCEDES':      'mercedes',
  'VW':            'volkswagen',
  'VOLKSWAGEN':    'volkswagen',
  'BMW':           'bmw',
  'AUDI':          'audi',
  'TOYOTA':        'toyota',
  'HYUNDAI':       'hyundai',
  'KIA':           'kia',
  'MAZDA':         'mazda',
  'NISSAN':        'nissan',
  'HONDA':         'honda',
  'FORD':          'ford',
  'JEEP':          'jeep',
  'CHEVROLET':     'chevrolet',
  'PEUGEOT':       'peugeot',
  'RENAULT':       'renault',
  'SKODA':         'skoda',
  'SEAT':          'seat',
  'FIAT':          'fiat',
  'OPEL':          'opel',
  'MITSUBISHI':    'mitsubishi',
  'SUBARU':        'subaru',
  'SUZUKI':        'suzuki',
  'VOLVO':         'volvo',
  'TESLA':         'tesla',
  'PORSCHE':       'porsche',
  'LEXUS':         'lexus',
  'DACIA':         'dacia',
  'MG':            'mg',
  'BYD':           'byd',
  'ORA':           'ora',
  'CHERY':         'chery',
  'GEELY':         'geely',
  'CUPRA':         'cupra',
};

const EN_MULTI_WORD_MAKES = ['ALFA ROMEO', 'LAND ROVER', 'MERCEDES BENZ', 'MERCEDES-BENZ'];

export interface DbMatch { makeSlug: string; modelSlug: string; year: number | null; }

/** One ownership period from the Ministry of Transport history dataset */
export interface OwnershipRecord {
  /** YYYYMM as a number, e.g. 202202 = Feb 2022 */
  date: number;
  /** Human-readable month/year string, e.g. "02/2022" */
  dateLabel: string;
  /** Ownership type in Hebrew, e.g. "פרטי", "סוחר", "ליסינג" */
  ownershipType: string;
}

/** Derived analysis of ownership history */
export interface OwnershipAnalysis {
  /** Total number of recorded ownership periods */
  periodCount: number;
  /** Types that appeared (deduplicated) */
  typesSeen: string[];
  /** True if vehicle was ever registered as commercial/dealer/leasing */
  wasCommercial: boolean;
  /** Current ownership type from active registry */
  currentType: string;
}

export interface Vehicle {
  country?: 'il' | 'uk';
  plate: number;
  displayPlate: string;
  name: string;
  makeHe: string;
  year: number | null;
  color: string;
  fuel: string;
  ownership: string;
  vin: string;
  lastTestDate: string;
  validUntil: string;
  firstRoad: string;
  frontTire: string;
  rearTire: string;
  emissionsGroup: number | null;
  odometer: number | null;
  hasAccident: boolean | null;
  wasRepainted: boolean | null;
  origin: string | null;
  structuralChange: boolean | null;
  tireChange: boolean | null;
  firstRegistrationDate: string | null;
  /** Ownership history from dataset 3 */
  ownershipHistory: OwnershipRecord[];
  ownershipAnalysis: OwnershipAnalysis | null;
  dataAvailability: {
    extraData: boolean;
    ownershipHistory: boolean;
  };
  // UK-specific fields
  motStatus?: string | null;
  motExpiryDate?: string | null;
  taxStatus?: string | null;
  taxDueDate?: string | null;
  engineCapacity?: number | null;
  dbMatch: DbMatch | null;
}

/** Detects the country from a raw plate string. */
export function detectCountry(plate: string): 'il' | 'uk' | 'unknown' {
  const s = plate.replace(/[\s\-]/g, '');
  if (/^\d+$/.test(s)) return 'il';
  if (/^[A-Z0-9]+$/i.test(s) && /[A-Z]/i.test(s) && /\d/.test(s)) return 'uk';
  return 'unknown';
}

export type LookupResult =
  | { status: 'found'; vehicle: Vehicle }
  | { status: 'not_found' }
  | { status: 'error' };

interface DbModel { make_slug: string; slug: string; name_en: string; years: string; }
interface CacheRow { ownership_json: string; extra_json: string | null; cached_at: number; }

function resolveSlugFromHebrew(tozetNm: string): string | null {
  const firstWord = tozetNm.trim().split(/\s+/)[0];
  return HE_MAKE_MAP[firstWord] ?? null;
}

function resolveSlugFromEnglish(kinuy: string): { makeSlug: string; modelPart: string } | null {
  const upper = kinuy.toUpperCase().trim();
  for (const mw of EN_MULTI_WORD_MAKES) {
    if (upper.startsWith(mw)) {
      return { makeSlug: EN_MAKE_MAP[mw]!, modelPart: upper.slice(mw.length).trim() };
    }
  }
  const first = upper.split(' ')[0];
  if (EN_MAKE_MAP[first]) return { makeSlug: EN_MAKE_MAP[first], modelPart: upper.slice(first.length).trim() };
  return null;
}

async function matchToDb(
  tozetNm: string, kinuyMishari: string, shnatYitzur: number | null,
): Promise<DbMatch | null> {
  let makeSlug = resolveSlugFromHebrew(tozetNm);
  let modelPart = kinuyMishari.toUpperCase().trim();

  if (!makeSlug) {
    const en = resolveSlugFromEnglish(kinuyMishari);
    if (en) { makeSlug = en.makeSlug; modelPart = en.modelPart; }
  }

  if (!makeSlug) return null;

  const models = await dbAll<DbModel>(
    'SELECT make_slug, slug, name_en, years FROM car_models WHERE make_slug = ?',
    makeSlug,
  ).catch(() => []);

  if (!models.length) return null;

  const modelWords = modelPart.split(/\s+/).filter(Boolean);
  let bestSlug: string | null = null;
  let bestScore = 0;
  let bestYear: number | null = null;

  for (const m of models) {
    const nameUp = m.name_en.toUpperCase();
    let score = 0;
    for (const w of modelWords) {
      if (w.length > 1 && nameUp.includes(w)) score++;
    }
    if (nameUp === modelPart) score += 5;
    if (score > bestScore) {
      bestScore = score;
      bestSlug = m.slug;
      try {
        const years: number[] = JSON.parse(m.years || '[]');
        if (shnatYitzur && years.length) {
          bestYear = years.includes(shnatYitzur)
            ? shnatYitzur
            : years.reduce((a, b) => Math.abs(b - shnatYitzur) < Math.abs(a - shnatYitzur) ? b : a);
        }
      } catch { bestYear = shnatYitzur; }
    }
  }

  if (!bestSlug || bestScore === 0) return null;
  return { makeSlug, modelSlug: bestSlug, year: bestYear };
}

function fmtPlate(plate: string): string {
  return plate.length === 7
    ? `${plate.slice(0, 3)}-${plate.slice(3, 5)}-${plate.slice(5)}`
    : `${plate.slice(0, 2)}-${plate.slice(2, 5)}-${plate.slice(5)}`;
}

/** Convert YYYYMM number to a "MM/YYYY" display label */
function fmtOwnershipDate(yyyymm: number): string {
  const s = String(yyyymm).padStart(6, '0');
  return `${s.slice(4, 6)}/${s.slice(0, 4)}`;
}

/** Fetch and analyse ownership history, with D1 caching */
async function fetchOwnershipHistory(plateNum: number): Promise<{ records: OwnershipRecord[]; fromCache: boolean }> {
  const cacheKey = `ownership:${plateNum}`;

  // Try cache first
  try {
    const cached = await dbFirst<CacheRow>(
      'SELECT ownership_json, cached_at FROM vehicle_history_cache WHERE plate = ?',
      cacheKey,
    );
    if (cached && Date.now() - cached.cached_at < CACHE_TTL_MS) {
      const records = JSON.parse(cached.ownership_json) as OwnershipRecord[];
      return { records, fromCache: true };
    }
  } catch { /* cache miss is fine */ }

  // Fetch from data.gov.il
  const url = `${DATA_GOV_URL}?resource_id=${OWNERSHIP_RESOURCE}&filters=${encodeURIComponent(JSON.stringify({ mispar_rechev: plateNum }))}&limit=100`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) }).catch(() => null);
  if (!res?.ok) return { records: [], fromCache: false };

  const data = await res.json().catch(() => null) as { success: boolean; result: { records: Array<{ mispar_rechev: number; baalut_dt: number; baalut: string }> } } | null;
  const raw = data?.result?.records ?? [];

  const records: OwnershipRecord[] = raw
    .filter(r => r.baalut_dt && r.baalut)
    .map(r => ({
      date: Number(r.baalut_dt),
      dateLabel: fmtOwnershipDate(Number(r.baalut_dt)),
      ownershipType: String(r.baalut),
    }))
    .sort((a, b) => a.date - b.date);

  // Deduplicate consecutive identical entries (dataset sometimes has duplicates)
  const deduped = records.filter((r, i) =>
    i === 0 || r.date !== records[i - 1].date || r.ownershipType !== records[i - 1].ownershipType
  );

  // Store in cache (fire-and-forget is fine here — reading the next time will miss cache if this fails)
  try {
    await dbRun(
      'INSERT OR REPLACE INTO vehicle_history_cache (plate, ownership_json, cached_at) VALUES (?, ?, ?)',
      cacheKey,
      JSON.stringify(deduped),
      Date.now(),
    );
  } catch { /* non-fatal */ }

  return { records: deduped, fromCache: false };
}

/** Derive analysis from ownership history */
function analyseOwnership(history: OwnershipRecord[], currentType: string): OwnershipAnalysis | null {
  if (history.length === 0) return null;

  const commercialTypes = ['סוחר', 'ליסינג', 'השכרה', 'חברה', 'מדינה', 'עירייה'];
  const typesSeen = [...new Set(history.map(r => r.ownershipType))];
  const wasCommercial = typesSeen.some(t => commercialTypes.some(c => t.includes(c)));

  return {
    periodCount: history.length,
    typesSeen,
    wasCommercial,
    currentType,
  };
}

export async function lookupVehicle(rawPlate: string): Promise<LookupResult> {
  const plate = rawPlate.replace(/\D/g, '');
  if (plate.length < 5 || plate.length > 8) return { status: 'not_found' };

  try {
    const plateNum = parseInt(plate, 10);
    const filters = encodeURIComponent(JSON.stringify({ mispar_rechev: plateNum }));

    // Fetch primary + extra + ownership in parallel
    const [mainRes, extraRes, ownershipResult] = await Promise.all([
      fetch(`${DATA_GOV_URL}?resource_id=${RESOURCE_ID}&filters=${filters}&limit=1`, { signal: AbortSignal.timeout(8000) }),
      fetch(`${DATA_GOV_URL}?resource_id=${EXTRA_RESOURCE}&filters=${filters}&limit=1`, { signal: AbortSignal.timeout(6000) }).catch(() => null),
      fetchOwnershipHistory(plateNum).catch(() => ({ records: [], fromCache: false })),
    ]);

    if (!mainRes.ok) return { status: 'error' };

    const data = await mainRes.json() as { success: boolean; result: { records: Record<string, unknown>[] } };
    const record = data?.result?.records?.[0];
    if (!record) return { status: 'not_found' };

    const kinuy  = String(record.kinuy_mishari ?? '');
    const tozet  = String(record.tozeret_nm ?? '');
    const shnat  = record.shnat_yitzur ? Number(record.shnat_yitzur) : null;
    const dbMatch = await matchToDb(tozet, kinuy, shnat);

    const extraData = extraRes?.ok ? await extraRes.json().catch(() => null) : null;
    const extra = extraData?.result?.records?.[0] ?? null;

    const ownershipHistory = ownershipResult.records;
    const currentOwnershipType = String(record.baalut ?? '');
    const ownershipAnalysis = analyseOwnership(ownershipHistory, currentOwnershipType);

    return {
      status: 'found',
      vehicle: {
        country:       'il',
        plate:         plateNum,
        displayPlate:  fmtPlate(plate),
        name:          kinuy,
        makeHe:        tozet,
        year:          shnat,
        color:         String(record.tzeva_rechev ?? ''),
        fuel:          String(record.sug_delek_nm ?? ''),
        ownership:     currentOwnershipType,
        vin:           String(record.misgeret ?? ''),
        lastTestDate:  String(record.mivchan_acharon_dt ?? ''),
        validUntil:    String(record.tokef_dt ?? ''),
        firstRoad:     String(record.moed_aliya_lakvish ?? ''),
        frontTire:     String(record.zmig_kidmi ?? ''),
        rearTire:      String(record.zmig_ahori ?? ''),
        emissionsGroup: record.kvutzat_zihum ? Number(record.kvutzat_zihum) : null,
        odometer:      extra?.kilometer_test_aharon ? Number(extra.kilometer_test_aharon) : null,
        hasAccident:   extra ? Number(extra.gapam_ind) === 1 : null,
        wasRepainted:  extra ? Number(extra.shnui_zeva_ind) === 1 : null,
        origin:        extra?.mkoriut_nm ? String(extra.mkoriut_nm) : null,
        structuralChange: extra ? Number(extra.shinui_mivne_ind) === 1 : null,
        tireChange:       extra ? Number(extra.shinui_zmig_ind) === 1 : null,
        firstRegistrationDate: extra?.rishum_rishon_dt ? String(extra.rishum_rishon_dt).split(' ')[0] : null,
        ownershipHistory,
        ownershipAnalysis,
        dataAvailability: {
          extraData: extra !== null,
          ownershipHistory: ownershipHistory.length > 0,
        },
        dbMatch,
      },
    };
  } catch {
    return { status: 'error' };
  }
}
