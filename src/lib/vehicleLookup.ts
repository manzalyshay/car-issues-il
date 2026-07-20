import { dbAll } from './db';

const DATA_GOV_URL  = 'https://data.gov.il/api/3/action/datastore_search';
const RESOURCE_ID   = '053cea08-09bc-40ec-8f7a-156f0677aff3';
const EXTRA_RESOURCE = '56063a99-8a3e-4ff4-912e-5966c0279bad';

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

const EN_MAKE_MAP: Record<string, string> = {
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

export interface Vehicle {
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
  dbMatch: DbMatch | null;
}

export type LookupResult =
  | { status: 'found'; vehicle: Vehicle }
  | { status: 'not_found' }
  | { status: 'error' };

interface DbModel { make_slug: string; slug: string; name_en: string; years: string; }

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

export async function lookupVehicle(rawPlate: string): Promise<LookupResult> {
  const plate = rawPlate.replace(/\D/g, '');
  if (plate.length < 5 || plate.length > 8) return { status: 'not_found' };

  try {
    const url = `${DATA_GOV_URL}?resource_id=${RESOURCE_ID}&filters=${encodeURIComponent(JSON.stringify({ mispar_rechev: parseInt(plate, 10) }))}&limit=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { status: 'error' };

    const data = await res.json() as { success: boolean; result: { records: Record<string, unknown>[] } };
    const record = data?.result?.records?.[0];
    if (!record) return { status: 'not_found' };

    const kinuy  = String(record.kinuy_mishari ?? '');
    const tozet  = String(record.tozeret_nm ?? '');
    const shnat  = record.shnat_yitzur ? Number(record.shnat_yitzur) : null;
    const dbMatch = await matchToDb(tozet, kinuy, shnat);

    const extraUrl = `${DATA_GOV_URL}?resource_id=${EXTRA_RESOURCE}&filters=${encodeURIComponent(JSON.stringify({ mispar_rechev: parseInt(plate, 10) }))}&limit=1`;
    const extraRes = await fetch(extraUrl, { signal: AbortSignal.timeout(5000) }).catch(() => null);
    const extraData = extraRes?.ok ? await extraRes.json().catch(() => null) : null;
    const extra = extraData?.result?.records?.[0] ?? null;

    return {
      status: 'found',
      vehicle: {
        plate:         parseInt(plate, 10),
        displayPlate:  fmtPlate(plate),
        name:          kinuy,
        makeHe:        tozet,
        year:          shnat,
        color:         String(record.tzeva_rechev ?? ''),
        fuel:          String(record.sug_delek_nm ?? ''),
        ownership:     String(record.baalut ?? ''),
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
        dbMatch,
      },
    };
  } catch {
    return { status: 'error' };
  }
}
