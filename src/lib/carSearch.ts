/**
 * Bilingual (Hebrew + English) car make/model search.
 *
 * - Every query word may match the Hebrew name, English name or slug of the make or model,
 *   so mixed queries work: "יונדאי kona", "hyundai קונה".
 * - Tolerates typos ("hyunadi", "toyta", "korola"), punctuation/spacing ("cx5" = "CX-5",
 *   "model3" = "Model 3"), Hebrew spelling variants (with/without א/ה/ו/י, final letters),
 *   and text typed with the wrong keyboard layout ("ןםטםאש" → "toyota", "hubsth" → "יונדאי").
 */
/** Minimal shapes the search needs — works with the full CarMake/CarModel types and slimmer ones. */
export interface SearchableModel { slug: string; nameHe: string; nameEn: string; activeVehiclesIl?: number | null }
export interface SearchableMake<M extends SearchableModel = SearchableModel> {
  slug: string; nameHe: string; nameEn: string; popular?: boolean; models: M[];
}

export interface CarSearchHit<K extends SearchableMake = SearchableMake> {
  make: K;
  model?: K['models'][number];
  score: number;
}

type CarMake = SearchableMake;
type CarModel = SearchableModel;

// ── Normalisation ────────────────────────────────────────────────────────────

const FINAL_LETTERS: Record<string, string> = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };

/** Lowercase, strip diacritics/niqqud, unify Hebrew final letters, drop punctuation. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-֑ͯ-ׇ]/g, '') // Latin accents + Hebrew niqqud/cantillation
    .replace(/[ךםןףץ]/g, c => FINAL_LETTERS[c])
    .replace(/[׳״'"`´]/g, '')                       // geresh / gershayim / quotes
    .replace(/[^a-z0-9א-ת]+/g, ' ')        // everything else becomes a separator
    .trim();
}

/** Hebrew "loose" form: drop matres lectionis so יונדאי ≈ יונדי ≈ ינדאי. */
const loose = (s: string) => s.replace(/[אהוי]/g, '');

/** Latin "sounds-like" form: korola ≈ corolla, qia ≈ kia. */
const phonetic = (s: string) =>
  s.replace(/ph/g, 'f').replace(/ck/g, 'c').replace(/[kq]/g, 'c').replace(/y/g, 'i').replace(/(.)\1+/g, '$1');

/** Common nicknames / alternative spellings, keyed by make slug. */
const MAKE_ALIASES: Record<string, string[]> = {
  volkswagen:   ['vw', 'פולקס', 'פולקסוואגן', 'פולקסווגן'],
  mercedes:     ['mercedes benz', 'benz', 'merc', 'mb', 'מרצדס', 'בנץ'],
  chevrolet:    ['chevy', 'שברולט', 'שברולה'],
  bmw:          ['במוו', 'ב.מ.וו'],
  'alfa-romeo': ['alfa', 'אלפא'],
  'land-rover': ['landrover', 'לנדרובר'],
  citroen:      ['סיטרואן', 'סיטרואין'],
  peugeot:      ['פג׳ו', 'פיג׳ו', 'פז׳ו', 'פיז׳ו'],
  skoda:        ['שקודה', 'סקודה'],
  'lynk-co':    ['lynk', 'לינק'],
};

// Israeli standard keyboard: Latin key → Hebrew letter on the same key
const EN_TO_HE: Record<string, string> = {
  q: '/', w: "'", e: 'ק', r: 'ר', t: 'א', y: 'ט', u: 'ו', i: 'ן', o: 'ם', p: 'פ',
  a: 'ש', s: 'ד', d: 'ג', f: 'כ', g: 'ע', h: 'י', j: 'ח', k: 'ל', l: 'ך', ';': 'ף',
  z: 'ז', x: 'ס', c: 'ב', v: 'ה', b: 'נ', n: 'מ', m: 'צ', ',': 'ת', '.': 'ץ',
};
const HE_TO_EN: Record<string, string> = Object.fromEntries(
  Object.entries(EN_TO_HE).map(([en, he]) => [he, en]),
);

/** Re-type the string as if the other keyboard layout had been active. */
function swapLayout(s: string): string {
  const lower = s.toLowerCase();
  const isHebrew = /[א-ת]/.test(lower);
  const map = isHebrew ? HE_TO_EN : EN_TO_HE;
  return Array.from(lower).map(c => map[c] ?? c).join('');
}

// ── Fuzzy matching ───────────────────────────────────────────────────────────

/** Damerau-Levenshtein (optimal string alignment) distance, early exit above `max`. */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
      rowMin = Math.min(rowMin, d[i][j]);
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
}

const allowedTypos = (len: number) => (len >= 7 ? 2 : len >= 4 ? 1 : 0);

/** Score one query word against one indexed token. 0 = no match. */
function scoreWord(word: string, token: string): number {
  if (token === word) return 10;
  if (token.startsWith(word)) return 7;
  if (word.length >= 2 && token.includes(word)) return 4;
  const isHe = /[א-ת]/.test(word);
  if (isHe) {
    // Vowel-letter-free forms are short and collide easily, so only trust longer ones
    const lw = loose(word), lt = loose(token);
    if (lw.length >= 3 && lt === lw) return 8;
    if (lw.length >= 3 && lt.startsWith(lw)) return 5;
    if (lw.length >= 1 && lt === lw) return 3;
  } else {
    const pw = phonetic(word), pt = phonetic(token);
    if (pw.length >= 3 && pt === pw) return 8;
    if (pw.length >= 3 && pt.startsWith(pw)) return 5;
  }
  const typos = allowedTypos(word.length);
  if (typos > 0) {
    if (editDistance(word, token, typos) <= typos) return 3;
    // Typo inside a partially typed longer name ("hyunda" → "hyundai")
    if (token.length > word.length && editDistance(word, token.slice(0, word.length), typos) <= typos) return 2;
  }
  return 0;
}

// ── Index ────────────────────────────────────────────────────────────────────

interface Entry {
  make: CarMake;
  model?: CarModel;
  makeTokens: string[];
  modelTokens: string[];
  popularity: number;
}

/** Tokens for a set of names: each word, plus the whole name with spaces removed ("model3", "cx5"). */
function tokensFor(...names: (string | undefined)[]): string[] {
  const out = new Set<string>();
  for (const name of names) {
    if (!name) continue;
    const n = normalize(name.replace(/-/g, ' '));
    if (!n) continue;
    for (const w of n.split(' ')) if (w) out.add(w);
    out.add(n.replace(/ /g, ''));
  }
  return Array.from(out);
}

const indexCache = new WeakMap<CarMake[], Entry[]>();

function buildIndex(makes: CarMake[]): Entry[] {
  const cached = indexCache.get(makes);
  if (cached) return cached;
  const entries: Entry[] = [];
  for (const make of makes) {
    const makeTokens = tokensFor(make.nameHe, make.nameEn, make.slug, ...(MAKE_ALIASES[make.slug] ?? []));
    const makePop = make.models.reduce((s, m) => s + (m.activeVehiclesIl ?? 0), 0);
    entries.push({ make, makeTokens, modelTokens: [], popularity: makePop + (make.popular ? 1e6 : 0) });
    for (const model of make.models) {
      entries.push({
        make, model, makeTokens,
        modelTokens: tokensFor(model.nameHe, model.nameEn, model.slug),
        popularity: model.activeVehiclesIl ?? 0,
      });
    }
  }
  indexCache.set(makes, entries);
  return entries;
}

// ── Query ────────────────────────────────────────────────────────────────────

function queryWords(q: string): string[] {
  const n = normalize(q.replace(/-/g, ' '));
  if (!n) return [];
  return n.split(' ').filter(Boolean);
}

function scoreEntry(words: string[], e: Entry): number {
  const all = e.model ? [...e.makeTokens, ...e.modelTokens] : e.makeTokens;
  let total = 0;
  let hitModel = false;
  for (const w of words) {
    let best = 0;
    let bestIsModel = false;
    for (const t of all) {
      const s = scoreWord(w, t);
      if (s > best) { best = s; bestIsModel = e.modelTokens.includes(t); }
    }
    if (best === 0) return 0; // every word must match something
    total += best;
    if (bestIsModel) hitModel = true;
  }
  // A model whose own name wasn't matched (query was just the make) ranks below the make itself
  if (e.model && !hitModel) total *= 0.5;
  return total;
}

function runQuery(words: string[], entries: Entry[]): CarSearchHit[] {
  const hits: CarSearchHit[] = [];
  for (const e of entries) {
    const s = scoreEntry(words, e);
    if (s > 0) hits.push({ make: e.make, model: e.model, score: s + Math.min(e.popularity, 400000) / 400000 });
  }
  return hits;
}

/**
 * Search makes and models. Returns hits ranked best-first.
 * `limit` caps the result count (default 8).
 */
export function searchCars<K extends SearchableMake>(makes: K[], query: string, limit = 8): CarSearchHit<K>[] {
  const words = queryWords(query);
  if (words.length === 0 || makes.length === 0) return [];
  const entries = buildIndex(makes);

  const hits = runQuery(words, entries);

  // Joined form ("cx 5" → "cx5", "model 3" → "model3")
  if (words.length > 1) {
    const joined = runQuery([words.join('')], entries);
    const seen = new Set(hits.map(h => h.make.slug + '/' + (h.model?.slug ?? '')));
    for (const h of joined) if (!seen.has(h.make.slug + '/' + (h.model?.slug ?? ''))) hits.push(h);
  }

  // Wrong keyboard layout fallback — only if the query as typed found nothing good
  const bestDirect = hits.reduce((m, h) => Math.max(m, h.score), 0);
  if (bestDirect < 6 * words.length) {
    const swapped = queryWords(swapLayout(query));
    if (swapped.length) {
      const alt = runQuery(swapped, entries);
      const seen = new Set(hits.map(h => h.make.slug + '/' + (h.model?.slug ?? '')));
      for (const h of alt) if (!seen.has(h.make.slug + '/' + (h.model?.slug ?? ''))) hits.push(h);
    }
  }

  hits.sort((a, b) => b.score - a.score);
  // Drop weak look-alikes when there is a clearly better match ("kona" shouldn't list Sonata)
  // If the best hit is a make ("מאזדה", "toyota"), keep that make's models listed under it.
  const best = hits[0];
  if (!best) return [];
  const cutoff = best.score * 0.6;
  return hits
    .filter(h => h.score >= cutoff || (!best.model && h.make.slug === best.make.slug))
    .slice(0, limit) as CarSearchHit<K>[];
}
