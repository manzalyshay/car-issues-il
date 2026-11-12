/**
 * Matching Ministry of Transport recall notices (D1 `recalls_il`) to site models.
 * Pure functions with no imports, so tests and scripts can load them directly.
 */

/** Uppercase, strip diacritics and non-alphanumerics - matches how `make` is stored in recalls_il. */
export function normalizeForMatch(s: string): string {
  return (s || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9]/g, '');
}

// Manufacturers whose Israeli notices are (also) filed under another make name.
export const MAKE_ALIASES: Record<string, string[]> = {
  CUPRA: ['CUPRA', 'SEAT'],
  GENESIS: ['GENESIS', 'HYUNDAI'], // "GENESIS GV70 GV80 G80" filed under Hyundai
  LEXUS: ['LEXUS', 'TOYOTA'],      // "LEXUS RX350" filed under Toyota
  MINI: ['MINI', 'BMW'],           // "MINI F56" filed under BMW
};

// Other spellings of a model in the Ministry data, keyed "MAKE:MODEL" (both normalized).
// Misspellings ("TUSCON"), names without the brand ("3" for BMW 3 Series), and
// chassis/generation codes that are not caught by the trailer rule below because
// they have no digit ("SANTA FE DM") or stand alone ("F56" is the Mini Cooper).
const MODEL_ALIASES: Record<string, string[]> = {
  'ALFAROMEO:GIULIA': ['GIULIAQV'],
  'AUDI:Q4ETRON': ['Q4'],
  'BMW:SERIES1': ['1'],
  'BMW:2SERIES': ['2'],
  'BMW:SERIES3': ['3'],
  'BMW:4SERIES': ['4'],
  'BMW:SERIES5': ['5', '530E'],
  'CHEVROLET:CORVETTE': ['CORVET'],
  'CHEVROLET:SPARK': ['SPART'],
  'CITROEN:C4SPACETOURER': ['SPACETOURER'],   // "C4,SPACETOURER"
  'CITROEN:C5AIRCROSS': ['AIRCROSS'],         // "C5,AIRCROSS"
  'HONDA:CRV': ['CVR'],
  'HYUNDAI:IONIQ6': ['IONIQCE6'],
  'HYUNDAI:SANTAFE': ['SANTAFEDM'],
  'HYUNDAI:SONATA': ['SONATANF', 'SONATALF'],
  'HYUNDAI:TUCSON': ['TUSCON'],
  'JEEP:GRANDCHEROKEE': ['GRANDCHEROKEEL'],
  'KIA:NIRO': ['NIROPLUS'],
  'LANDROVER:DEFENDER': ['DEFENDER90', 'DEFENDER110', 'DEFENDER130'],
  'LANDROVER:DISCOVERY': ['DISCOVERY3', 'DISCOVERY4', 'DISCOVERY5'],
  'LANDROVER:RANGEROVEREVOQUE': ['EVOQUE'],
  'MASERATI:QUATTROPORTE': ['QUATROPORTE'],
  'MAZDA:MAZDA3': ['BK', 'BK3', 'BM'],
  'MERCEDESBENZ:GCLASS': ['GCLASSS'],
  'MERCEDESBENZ:MLCLASS': ['ML'],
  'MINI:COOPER': ['F55', 'F56', 'F65', 'F66'],
  'MINI:COUNTRYMAN': ['F60', 'U25'],
  'MITSUBISHI:ASX': ['AXS'],
  'MITSUBISHI:LANCER': ['LANCERSADAN', 'LANCERSEDAN', 'LANCERSPORTBACK'],
  'MITSUBISHI:OUTLANDER': ['OUTLANDERDG'],
  'NISSAN:XTRAIL': ['XTRAIK'],
  'OPEL:CORSA': ['CORSAD', 'CORSAE', 'CORSAF'],
  'OPEL:CROSSLAND': ['CROSSLANDX'],
  'OPEL:GRANDLAND': ['GRANLAND', 'GRANDLANDX'],
  'OPEL:MOKKA': ['MOOKA', 'MOKKAX'],
  'RENAULT:CLIO': ['CLIOIV', 'CLIOV', 'CLIORS4', 'CLIOSPORT'],
  'SKODA:KAROQ': ['CAROC'],
  'SKODA:OCTAVIA': ['OCTAVIA3', 'OCTAVIA4'],
  'SUBARU:XV': ['CROSSTREK'], // the XV was renamed Crosstrek
  'SUZUKI:SCROSS': ['SX4SCROSS'],
  'TESLA:MODEL3': ['3'],
  'TESLA:MODELS': ['S'],
  'TESLA:MODELX': ['X'],
  'TESLA:MODELY': ['Y'],
  'TOYOTA:COROLLACROSS': ['COROLACROSS'],
  'TOYOTA:LANDCRUISER': ['LANDCRUISERPRADO', 'LANDCRS250'],
  'VOLKSWAGEN:GOLF': ['GOLF7', 'GOLF8'],
  'VOLKSWAGEN:TIGUAN': ['TIGUANLWB'],
  'VOLVO:XC60': ['60XC'],
};

// Powertrain / body words that still mean "this model" when they follow the model
// name in a DEGEM segment (e.g. "KUGA PHEV", "AVENGER BEV", "NEW RANGE ROVER EVOQUE LZ").
// Anything else (e.g. "RANGE ROVER SPORT", "IX3") is a different model and is not matched.
const MODEL_SUFFIXES = [
  'PHEV', 'MHEV', 'HEV', 'BEV', 'EV', 'PHV', 'HYBRID', 'HIBRID', 'PLUGIN', 'PLUGINHYBRID', 'ELECTRIC',
  '4XE', 'DIESEL', 'DIZEL', 'CAB', 'CABRIO', 'SW', 'LZ', 'JZ',
];

/**
 * A chassis/generation code after the model name ("TUSCON NX4E", "X-TRAIL T33",
 * "OUTLANDER GF6W"): letters then a digit. A bare number never counts, so IX3 vs IX35,
 * IONIQ vs IONIQ 5 and GOLF vs GOLF 7 are not confused by this rule.
 */
const CHASSIS_CODE = /^[A-Z]{1,3}\d[A-Z0-9]{0,2}$/;

/** Normalized model keys to look for: the model itself, its aliases, and the name without the brand ("MAZDA3" -> "3"). */
function modelKeysFor(modelKey: string, makeKeys: string[]): string[] {
  const keys = [modelKey, ...(MODEL_ALIASES[`${makeKeys[0]}:${modelKey}`] ?? [])];
  const mk = makeKeys[0];
  if (mk && modelKey.startsWith(mk) && modelKey.length > mk.length) keys.push(modelKey.slice(mk.length));
  return keys;
}

/** Whether a normalized string names this model key, allowing a known suffix after it. */
function keyMatches(norm: string, modelKey: string, makeKeys: string[]): boolean {
  let seg = norm;
  if (!seg || !modelKey) return false;
  if (seg.startsWith('NEW') && seg !== modelKey) seg = seg.slice(3);
  for (const mk of makeKeys) if (seg.startsWith(mk) && seg.length > mk.length && seg !== modelKey) seg = seg.slice(mk.length);
  if (seg === modelKey) return true;
  if (!seg.startsWith(modelKey)) return false;
  const rest = seg.slice(modelKey.length);
  if (MODEL_SUFFIXES.includes(rest)) return true;
  // Mercedes chassis codes: "C CLASS 206", "GLE 167", "GLC254"
  if ((modelKey.endsWith('CLASS') || makeKeys[0] === 'MERCEDESBENZ') && /^\d{3}$/.test(rest)) return true;
  // Lexus engine designations: "RX350", "NX300H", "UX250H", "IS 300H"
  if (makeKeys[0] === 'LEXUS' && /^\d{3}[A-Z]?$/.test(rest)) return true;
  return false;
}

/** Words of a segment, normalized; "F-16" stays one word and "PLUG IN" becomes "PLUGIN". */
function words(segment: string): string[] {
  return segment.toUpperCase().replace(/\bPLUG\s+IN\b/g, 'PLUGIN').split(/\s+/).map(normalizeForMatch).filter(Boolean);
}

/**
 * Whether one DEGEM segment names the given model. Segments are split on ',' and
 * '/', normalized, and a leading "NEW" or the brand name itself is ignored. The model
 * name may be followed by powertrain words and chassis codes ("ELANTRA HYBRID CN7 HEV").
 */
export function degemSegmentMatches(segment: string, modelKey: string, makeKeys: string[]): boolean {
  if (!modelKey) return false;
  const keys = modelKeysFor(modelKey, makeKeys);
  const norm = normalizeForMatch(segment);
  if (keys.some((k) => keyMatches(norm, k, makeKeys))) return true;
  const ws = words(segment);
  for (let i = 1; i < ws.length; i++) {
    const head = ws.slice(0, i).join('');
    if (!keys.some((k) => keyMatches(head, k, makeKeys))) continue;
    if (ws.slice(i).every((w) => MODEL_SUFFIXES.includes(w) || CHASSIS_CODE.test(w))) return true;
  }
  return false;
}

/**
 * Parts of a DEGEM segment that may each name a model: the segment itself, its pieces
 * between runs of 2+ spaces ("I5  IX1  X1  X2"), and - when it is a space-separated list
 * of short model codes (with a digit, or two letters like "RX") - each code ("1 2 3 4 5 6", "GENESIS GV70 GV80 G80", "BK 3").
 */
function segmentParts(segment: string, makeKeys: string[]): string[] {
  const parts = [segment];
  const wide = segment.split(/\s{2,}/).map((s) => s.trim()).filter(Boolean);
  if (wide.length > 1) parts.push(...wide);
  for (const piece of wide) {
    const ws = piece.split(/\s+/).map(normalizeForMatch).filter(Boolean);
    while (ws.length && (ws[0] === 'NEW' || makeKeys.includes(ws[0]))) ws.shift();
    if (ws.length > 1 && ws.every((w) => /^[A-Z0-9]{1,4}$/.test(w) && (/\d/.test(w) || /^[A-Z]{2}$/.test(w)))) parts.push(...ws);
  }
  return parts;
}

export function degemMatches(degem: string | null, modelKey: string, makeKeys: string[]): boolean {
  return (degem || '').split(/[,/]/).some((seg) =>
    segmentParts(seg, makeKeys).some((part) => degemSegmentMatches(part, modelKey, makeKeys)));
}

/** Whether a notice's production window overlaps [fromYear, toYear] (inclusive). Unknown dates count as overlapping. */
export function buildWindowOverlaps(r: { buildBegin: string | null; buildEnd: string | null }, fromYear: number, toYear: number): boolean {
  const b = parseInt((r.buildBegin || '').slice(0, 4));
  const e = parseInt((r.buildEnd || '').slice(0, 4));
  return (isNaN(b) || b <= toYear) && (isNaN(e) || e >= fromYear);
}
