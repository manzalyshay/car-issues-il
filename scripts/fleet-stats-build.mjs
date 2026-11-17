#!/usr/bin/env node
// Turns the raw registry combination counter written by fleet-stats-fetch.mjs
// into the compact snapshot the /israel-car-stats page renders.
//
//   node scripts/fleet-stats-fetch.mjs /tmp/fleet-raw.json
//   node scripts/fleet-stats-build.mjs /tmp/fleet-raw.json
//
// Output: src/data/fleetStats.json
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const input = process.argv[2] || join(tmpdir(), 'fleet-stats-raw.json');
const output = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'fleetStats.json');
const raw = JSON.parse(readFileSync(input, 'utf8'));

// ── Brands ───────────────────────────────────────────────────────────────────
// The registry's manufacturer field is "<brand> <country of manufacture>",
// often truncated ("פולקסווגן גרמנ"). Longest matching prefix wins.
// [hebrew prefix, English name, Hebrew display name, brand origin]
const BRANDS = [
  ['קיה', 'Kia', 'קיה', 'KR'], ['יונדאי', 'Hyundai', 'יונדאי', 'KR'], ['סקודה', 'Skoda', 'סקודה', 'CZ'],
  ['מזדה', 'Mazda', 'מזדה', 'JP'], ['טויוטה', 'Toyota', 'טויוטה', 'JP'], ['מיצובישי', 'Mitsubishi', 'מיצובישי', 'JP'],
  ['סיאט', 'Seat', 'סיאט', 'ES'], ['סוזוקי', 'Suzuki', 'סוזוקי', 'JP'], ['מרוטי', 'Suzuki', 'סוזוקי', 'JP'],
  ['סובארו', 'Subaru', 'סובארו', 'JP'], ['צרי', 'Chery', "צ'רי", 'CN'], ['ניסאן', 'Nissan', 'ניסאן', 'JP'],
  ['בי ווי די', 'BYD', 'BYD', 'CN'], ['שברולט', 'Chevrolet', 'שברולט', 'US'], ['פולקסווגן', 'Volkswagen', 'פולקסווגן', 'DE'],
  ['רנו', 'Renault', 'רנו', 'FR'], ['גאקו', 'Jaecoo', "ג'אקו", 'CN'], ['הונדה', 'Honda', 'הונדה', 'JP'],
  ['מ.גי', 'MG', 'MG', 'CN'], ['סיטרואן', 'Citroen', 'סיטרואן', 'FR'], ['פיגו', 'Peugeot', "פיג'ו", 'FR'],
  ['מרצדס', 'Mercedes-Benz', 'מרצדס', 'DE'], ['ב מ וו', 'BMW', 'ב.מ.וו', 'DE'], ['פורד', 'Ford', 'פורד', 'US'],
  ['גילי', 'Geely', "ג'ילי", 'CN'], ['טסלה', 'Tesla', 'טסלה', 'US'], ['איסוזו', 'Isuzu', 'איסוזו', 'JP'],
  ['דאציה', 'Dacia', "דאצ'יה", 'RO'], ['אאודי', 'Audi', 'אאודי', 'DE'], ['אודי', 'Audi', 'אאודי', 'DE'],
  ['לקסוס', 'Lexus', 'לקסוס', 'JP'], ['דייהטסו', 'Daihatsu', 'דייהטסו', 'JP'], ['אקספנג', 'Xpeng', 'אקספנג', 'CN'],
  ['אופל', 'Opel', 'אופל', 'DE'], ['וולבו', 'Volvo', 'וולוו', 'SE'], ['לינק', 'Lynk & Co', 'לינק אנד קו', 'CN'],
  ['גיפ', 'Jeep', "ג'יפ", 'US'], ['זיקר', 'Zeekr', 'זיקר', 'CN'], ['פיאט', 'Fiat', 'פיאט', 'IT'],
  ['אלפא', 'Alfa Romeo', 'אלפא רומיאו', 'IT'], ['רובר', 'Land Rover', 'לנד רובר', 'GB'], ['לנדרובר', 'Land Rover', 'לנד רובר', 'GB'],
  ['דיפאל', 'Deepal', 'דיפאל', 'CN'], ['קיי גי', 'KGM', 'KGM', 'KR'], ['סאנגיונג', 'KGM', 'KGM', 'KR'],
  ['קאדילאק', 'Cadillac', 'קאדילק', 'US'], ['סרס', 'Seres', 'סרס', 'CN'], ['אומודה', 'Omoda', 'אומודה', 'CN'],
  ['אורה', 'ORA', 'אורה', 'CN'], ['ליפמוטור', 'Leapmotor', 'ליפמוטור', 'CN'], ['מקסוס', 'Maxus', 'מקסוס', 'CN'],
  ['דונגפנג', 'Dongfeng', 'דונגפנג', 'CN'], ['קופרה', 'Cupra', 'קופרה', 'ES'], ['פורשה', 'Porsche', 'פורשה', 'DE'],
  ['סמארט', 'Smart', 'סמארט', 'DE'], ['סקיוול', 'Skywell', 'סקייוול', 'CN'], ['ביואיק', 'Buick', 'ביואיק', 'US'],
  ['איווייס', 'Aiways', 'איווייס', 'CN'], ['אף איי דבליו', 'Hongqi', 'הונגצ׳י', 'CN'], ['איויאיסי', 'EVEasy', 'EVEasy', 'CN'],
  ['וויה', 'Voyah', 'וויה', 'CN'], ['איון', 'Aion', 'איון', 'CN'], ['יגואר', 'Jaguar', 'יגואר', 'GB'],
  ['פורתינג', 'Forthing', 'פורתינג', 'CN'], ['גי.איי.סי', 'GAC', 'GAC', 'CN'], ['וואי', 'WEY', 'WEY', 'CN'],
  ['פוטון', 'Foton', 'פוטון', 'CN'], ['די אס', 'DS', 'DS', 'FR'], ['גאק', 'JAC', 'JAC', 'CN'], ['גיי איי סי', 'JAC', 'JAC', 'CN'],
  ['פולסטאר', 'Polestar', 'פולסטאר', 'SE'], ['מזארטי', 'Maserati', 'מזראטי', 'IT'], ['איי אם', 'IM', 'IM', 'CN'],
  ['אוואטר', 'Avatr', 'אווטר', 'CN'], ['ניאו', 'NIO', 'NIO', 'CN'], ['גי.אמ.סי', 'GMC', 'GMC', 'US'],
  ['באייק', 'BAIC', 'BAIC', 'CN'], ['האמר', 'Hummer', 'האמר', 'US'], ['נטע', 'Neta', 'נטע', 'CN'],
  ['יודו', 'Yudo', 'יודו', 'CN'], ['גרייט וול', 'Great Wall', 'גרייט וול', 'CN'], ['דודג', 'Dodge', "דודג'", 'US'],
  ['סאאב', 'Saab', 'סאאב', 'SE'], ['לנציה', 'Lancia', "לנצ'יה", 'IT'], ['פרארי', 'Ferrari', 'פרארי', 'IT'],
  ['בנטלי', 'Bentley', 'בנטלי', 'GB'], ['אסטון', 'Aston Martin', 'אסטון מרטין', 'GB'], ['פאריזון', 'Farizon', 'פאריזון', 'CN'],
  ['קרייזלר', 'Chrysler', 'קרייזלר', 'US'], ['דיימלר', 'Mercedes-Benz', 'מרצדס', 'DE'], ['דימלר', 'Mercedes-Benz', 'מרצדס', 'DE'],
  ['מיני', 'Mini', 'מיני', 'GB'], ['אינפיניטי', 'Infiniti', 'אינפיניטי', 'JP'], ['לינקולן', 'Lincoln', 'לינקולן', 'US'],
  ['למבורגיני', 'Lamborghini', 'למבורגיני', 'IT'], ['רולס', 'Rolls-Royce', 'רולס רויס', 'GB'], ['מקלארן', 'McLaren', 'מקלארן', 'GB'],
  ['לוטוס', 'Lotus', 'לוטוס', 'GB'], ['דאיהו', 'Daewoo', 'דייהו', 'KR'], ['דייהו', 'Daewoo', 'דייהו', 'KR'],
  ['גנסיס', 'Genesis', "ג'נסיס", 'KR'], ['לאדה', 'Lada', 'לאדה', 'RU'], ['רם', 'Ram', 'ראם', 'US'], ['ראם', 'Ram', 'ראם', 'US'],
].sort((a, b) => b[0].length - a[0].length);

const stripMarks = (s) => s.replace(/['׳"״`’]/g, '');
const JEEP_RE = /CHEROKEE|WRANGLER|JEEP|RENEGADE|COMPASS|PATRIOT|LIBERTY|COMMANDER|GLADIATOR|AVENGER/;
const DODGE_RE = /DODGE|JOURNEY|CALIBER|\bRAM\b|DURANGO|CHALLENGER|CHARGER|NITRO|AVENGER/;
const CHRYSLER_RE = /VOYAGER|PACIFICA|300C|SEBRING|PT CRUISER|TOWN/;
const B = (en) => { const b = BRANDS.find((x) => x[1] === en); return { en: b[1], he: b[2], origin: b[3] }; };

const brandCache = new Map();
function resolveBrand(tozeret, kinuy) {
  const t = stripMarks(tozeret).trim();
  if (/^(קרייזלר|דיימלר|דימלר|פיאט קרייזלר)/.test(t)) {
    if (JEEP_RE.test(kinuy) && !/^(דיימלר|דימלר)/.test(t) || /CHEROKEE|WRANGLER|JEEP|RENEGADE/.test(kinuy)) return B('Jeep');
    if (/^קרייזלר/.test(t)) return DODGE_RE.test(kinuy) ? B('Dodge') : B('Chrysler');
    if (/^פיאט/.test(t)) return B('Fiat');
    if (CHRYSLER_RE.test(kinuy)) return B('Chrysler');
    if (DODGE_RE.test(kinuy)) return B('Dodge');
    return B('Mercedes-Benz');
  }
  if (brandCache.has(t)) return brandCache.get(t);
  const hit = BRANDS.find((b) => t.startsWith(b[0]));
  const res = hit ? { en: hit[1], he: hit[2], origin: hit[3] } : null;
  brandCache.set(t, res);
  return res;
}

// ── Country of manufacture (suffix of the manufacturer field) ───────────────
const COUNTRIES = [
  [/יפן/, 'JP'], [/קורי/, 'KR'], [/צכיה/, 'CZ'], [/טורקיה/, 'TR'], [/סין/, 'CN'], [/גרמנ/, 'DE'],
  [/ספרד|-ספ$/, 'ES'], [/צרפת/, 'FR'], [/אנגליה| אנ$/, 'GB'], [/ארה|-אר$/, 'US'], [/הונגריה|הונג$/, 'HU'],
  [/סלובקי?ה?$|סלובק$|סלוב$/, 'SK'], [/תאילנ/, 'TH'], [/הודו/, 'IN'], [/מקסי/, 'MX'], [/רומניה/, 'RO'],
  [/פולי/, 'PL'], [/איטליה|_אי$/, 'IT'], [/בלגיה/, 'BE'], [/שבדיה/, 'SE'], [/פורט|_פו$/, 'PT'],
  [/מרוקו/, 'MA'], [/קנדה/, 'CA'], [/סלובניה/, 'SI'], [/אפר|ד\.אפ?$/, 'ZA'], [/אוסט/, 'AT'], [/הולנד/, 'NL'],
  [/סרביה/, 'RS'], [/^מרוטי/, 'IN'], [/^לינק/, 'CN'], [/^קיי גי/, 'KR'], [/^אף איי/, 'CN'], [/^גיי איי/, 'CN'],
  [/אוונגר/, 'PL'],
];
const countryCache = new Map();
function resolveCountry(tozeret) {
  const t = stripMarks(tozeret).trim();
  if (countryCache.has(t)) return countryCache.get(t);
  const hit = COUNTRIES.find(([re]) => re.test(t));
  const c = hit ? hit[1] : 'XX';
  countryCache.set(t, c);
  return c;
}

// ── Models ──────────────────────────────────────────────────────────────────
// Trade names come in many spellings ("COROLLA HSD SDN", "MAZDA3", "RAV 4
// HYBRID"). Drop the brand prefix and powertrain/body/facelift tokens, then
// collapse punctuation so every spelling of a nameplate shares one key.
const DROP = new Set(['HSD', 'SDN', 'TS', 'HYBRID', 'HEV', 'PHEV', 'EV', 'FL', 'NEW', 'MHEV', 'BEV', 'HB', 'SW', 'STW', 'TURBO', 'AUTO']);
const BRAND_PREFIX = /^(MAZDA|JAECOO|BYD|FIAT|JEEP|LYNK ?& ?CO|LYNK ?CO|KIA|HYUNDAI|TOYOTA|SUZUKI|HONDA|NISSAN|SKODA|SEAT|SUBARU|RENAULT|PEUGEOT|CITROEN|VOLVO|TESLA|CHERY|GEELY|XPENG|ZEEKR|DEEPAL|OPEL|FORD|CHEVROLET|AUDI|BMW|MERCEDES|LEXUS|DACIA|VW|VOLKSWAGEN|MITSUBISHI|ISUZU|DAIHATSU)(?=[\s\d-]|$)\s*/;
const KEEP_UPPER = new Set(['RAV4', 'ASX', 'EHS', 'ATTO', 'BYD', 'GLC', 'GLA', 'GLB', 'GLE', 'XCEED', 'IONIQ']);
function cleanModel(kinuy, brandEn) {
  let s = kinuy.toUpperCase().replace(/^[.\s]+/, '').trim();
  // "MG3"/"MG4" are the model names themselves; keep those.
  if (brandEn !== 'MG') s = s.replace(BRAND_PREFIX, '');
  const tokens = s.split(/\s+/).filter((w) => w && !DROP.has(w) && !/^\d\.\d[A-Z]*$/.test(w));
  const label = tokens.join(' ');
  return { key: label.replace(/[^A-Z0-9]/g, ''), label };
}
function prettyModel(label) {
  const spaced = label
    .replace(/\b([A-Z]{4,})(\d)/g, '$1 $2')
    .replace(/(\d)(PRO|PLUS|MAX)\b/g, '$1 $2')
    .replace(/\bRAV 4\b/, 'RAV4');
  return spaced.split(' ').map((w) => {
    if (KEEP_UPPER.has(w)) return w === 'ATTO' ? 'Atto' : w === 'IONIQ' ? 'Ioniq' : w;
    if (/^I\d\d$/.test(w)) return w.toLowerCase();
    return /^[A-Z]{3,}$/.test(w) ? w[0] + w.slice(1).toLowerCase() : w;
  }).join(' ');
}

// ── Colours ─────────────────────────────────────────────────────────────────
const COLOR_GROUPS = [
  ['white', /^(שנהב|שן פיל|לבן)/], ['silver', /^(כסף|כסוף|פלטינה)/], ['gray', /^אפור/], ['black', /^שחור/],
  ['blue', /^(כחול|תכלת)/], ['red', /^(אדום|בורדו)/], ['brown', /^(בז|קפה|חום|ברונזה|קרם|סהרה|זהב|זהוב|נחושת|שמפניה|חול)/],
  ['green', /^(ירוק|ירקרק|טורקיז)/], ['orange', /^כתום/], ['yellow', /^צהוב/], ['purple', /^(סגול|חציל|ורוד)/],
];
const colorGroup = (c) => (COLOR_GROUPS.find(([, re]) => re.test(c)) || ['other'])[0];

const FUEL = { 'בנזין': 'petrol', 'דיזל': 'diesel', 'חשמל': 'ev', 'חשמל/בנזין': 'phev', 'חשמל/דיזל': 'phev', 'גפמ': 'lpg' };
const OWN = { 'פרטי': 'private', 'ליסינג': 'leasing', 'חברה': 'company', 'סוחר': 'dealer', 'השכרה': 'rental' };

// ── Aggregate ───────────────────────────────────────────────────────────────
const inc = (o, k, n) => { o[k] = (o[k] || 0) + n; };
const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);

const brands = {};        // en → {he, origin, n, ev, phev}
const models = {};        // "en|key" → {brand, labels{}, n, ev, phev, fleet, years{}}
const countries = {}, colors = {}, rawColors = {}, fuel = {}, ownership = {}, years = {};
const byYear = {};        // year → {n, ev, phev, cn, white, models{}}
const unmapped = {};
let total = 0;

for (const [k, n] of raw.combos) {
  const [tozeret, kinuy, yearS, color, fuelHe, ownHe] = k.split('|');
  total += n;
  const year = Number(yearS) || 0;
  const f = FUEL[stripMarks(fuelHe)] || 'other';
  const own = OWN[ownHe] || 'other';
  const cg = colorGroup(color);
  const brand = resolveBrand(tozeret, kinuy);
  if (!brand) inc(unmapped, tozeret, n);
  const bEn = brand ? brand.en : 'Other';

  const b = (brands[bEn] ??= { he: brand ? brand.he : 'אחר', origin: brand ? brand.origin : 'XX', n: 0, ev: 0, phev: 0 });
  b.n += n; if (f === 'ev') b.ev += n; if (f === 'phev') b.phev += n;

  inc(countries, resolveCountry(tozeret), n);
  inc(colors, cg, n); inc(rawColors, color, n); inc(fuel, f, n); inc(ownership, own, n); inc(years, year, n);

  const y = (byYear[year] ??= { n: 0, ev: 0, phev: 0, cn: 0, white: 0, models: {} });
  y.n += n; if (f === 'ev') y.ev += n; if (f === 'phev') y.phev += n;
  if (brand?.origin === 'CN') y.cn += n; if (cg === 'white') y.white += n;

  if (brand) {
    const { key, label } = cleanModel(kinuy, brand.en);
    if (key) {
      const mk = `${brand.en}|${key}`;
      const m = (models[mk] ??= { brand: brand.en, labels: {}, n: 0, ev: 0, phev: 0, fleet: 0 });
      m.n += n; inc(m.labels, label, n);
      if (f === 'ev') m.ev += n; if (f === 'phev') m.phev += n;
      if (own === 'leasing' || own === 'company' || own === 'rental') m.fleet += n;
      inc(y.models, mk, n);
    }
  }
}

const modelName = (mk) => prettyModel(top(models[mk].labels, 1)[0][0]);
const modelRow = (mk, n) => ({ brand: models[mk].brand, model: modelName(mk), key: mk.split('|')[1], n });

// Monthly first-registration counts (vehicles still on the road).
const monthly = {};
for (const [k, n] of raw.entries) {
  const [moed, , , fuelHe] = k.split('|');
  const [yy, mm] = moed.split('-').map(Number);
  const id = `${yy}-${String(mm).padStart(2, '0')}`;
  const f = FUEL[stripMarks(fuelHe)] || 'other';
  const m = (monthly[id] ??= { n: 0, ev: 0, phev: 0 });
  m.n += n; if (f === 'ev') m.ev += n; if (f === 'phev') m.phev += n;
}
const fetchedMonth = raw.fetchedAt.slice(0, 7);
const months = Object.keys(monthly).sort().filter((id) => id < fetchedMonth)
  .map((id) => ({ m: id, ...monthly[id] }));

const snapshotYear = Number(raw.fetchedAt.slice(0, 4));
let ageSum = 0, ageN = 0, over10 = 0, over15 = 0, over20 = 0;
for (const [y, n] of Object.entries(years)) {
  const yr = Number(y); if (!yr) continue;
  const age = Math.max(0, snapshotYear - yr);
  ageSum += age * n; ageN += n;
  if (age >= 10) over10 += n; if (age >= 15) over15 += n; if (age >= 20) over20 += n;
}

const brandList = Object.entries(brands).filter(([en]) => en !== 'Other').sort((a, b) => b[1].n - a[1].n);
const out = {
  fetchedAt: raw.fetchedAt,
  source: { name: 'data.gov.il', resource: '053cea08-09bc-40ec-8f7a-156f0677aff3' },
  total,
  brandCount: brandList.length,
  brands: brandList.slice(0, 40).map(([en, b]) => ({ en, he: b.he, origin: b.origin, n: b.n, ev: b.ev, phev: b.phev })),
  models: Object.keys(models).sort((a, b) => models[b].n - models[a].n).slice(0, 50).map((mk) => modelRow(mk, models[mk].n)),
  evModels: Object.keys(models).sort((a, b) => models[b].ev - models[a].ev).slice(0, 15).map((mk) => modelRow(mk, models[mk].ev)),
  phevModels: Object.keys(models).sort((a, b) => models[b].phev - models[a].phev).slice(0, 10).map((mk) => modelRow(mk, models[mk].phev)),
  fleetModels: Object.keys(models).sort((a, b) => models[b].fleet - models[a].fleet).slice(0, 10).map((mk) => modelRow(mk, models[mk].fleet)),
  evBrands: brandList.slice().sort((a, b) => b[1].ev - a[1].ev).slice(0, 10).map(([en, b]) => ({ en, he: b.he, n: b.ev })),
  countries: top(countries, 16).map(([c, n]) => ({ c, n })),
  origins: top(brandList.reduce((o, [, b]) => { inc(o, b.origin, b.n); return o; }, {}), 10).map(([c, n]) => ({ c, n })),
  colors: top(colors, 12).map(([c, n]) => ({ c, n })),
  rawColors: top(rawColors, 10).map(([he, n]) => ({ he, n })),
  fuel, ownership,
  years: Object.entries(years).filter(([y]) => Number(y) >= 1996).sort((a, b) => a[0] - b[0]).map(([y, n]) => ({ y: Number(y), n })),
  byYear: Object.entries(byYear).filter(([y]) => Number(y) >= 2010).sort((a, b) => a[0] - b[0]).map(([y, v]) => {
    const [mk, n] = top(v.models, 1)[0];
    return { y: Number(y), n: v.n, ev: v.ev, phev: v.phev, cn: v.cn, white: v.white, top: modelRow(mk, n) };
  }),
  age: { avg: Math.round((ageSum / ageN) * 10) / 10, over10, over15, over20 },
  months,
};

writeFileSync(output, JSON.stringify(out));
const um = top(unmapped, 15);
console.log(`total ${total} · brands ${brandList.length} · unmapped ${Object.values(unmapped).reduce((a, b) => a + b, 0)}`);
if (um.length) console.log('unmapped:', um.map((x) => x.join(':')).join(' ; '));
console.log(`wrote ${output} (${JSON.stringify(out).length} bytes)`);
