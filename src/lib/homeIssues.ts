/**
 * "בעיות וריקולים" on the home page: a random mix of official Israeli recall notices
 * (Ministry of Transport, Hebrew site only) and weaknesses found in published road tests
 * (model_synthesis). Everything shown comes from stored records - no invented numbers.
 */
import { getAllMakes, type CarMake, type CarModel } from './carsDb';
import { dbAll } from './db';
import { getIsraeliRecalls, buildWindowOverlaps } from './israeliRecallsDb';
import { buildYearsLabel } from './issuesSummary';
import { sizedImageUrl } from './imageSizing';
import { getImagesForCar } from './carImages';

export interface HomeIssue {
  kind: 'recall' | 'test';
  href: string;
  carName: string;
  years: string;
  title: string;
  /** Road test: the site the finding comes from. Recall: empty. */
  source: string;
  /** Recall: the year the notice was published. */
  noticeYear: number | null;
  imageUrl: string | null;
  logoUrl: string;
}

const RECALLS_WANTED = 8;
const TESTS_WANTED = 10;
/** Recall notices older than this many years are left out. */
const RECENT_YEARS = 3;

function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Ministry notices often carry double spaces and a space before punctuation. */
const cleanText = (s: string) => s.replace(/\s+/g, ' ').replace(/\s+([.,:;!?])/g, '$1').trim();

const yearsOf = (m: CarModel) => (m.years.length ? `${Math.min(...m.years)}–${Math.max(...m.years)}` : '');

/** Alternates the two kinds (recall, test, recall, ...) so any first few cards mix both. */
export function interleave(recalls: HomeIssue[], tests: HomeIssue[]): HomeIssue[] {
  const out: HomeIssue[] = [];
  for (let i = 0; i < Math.max(recalls.length, tests.length); i++) {
    if (recalls[i]) out.push(recalls[i]);
    if (tests[i]) out.push(tests[i]);
  }
  return out;
}

export async function getHomeIssues(locale: 'he' | 'en'): Promise<HomeIssue[]> {
  const isEn = locale === 'en';
  const makes = await getAllMakes();
  const byKey = new Map<string, { make: CarMake; model: CarModel }>();
  for (const make of makes) for (const model of make.models) byKey.set(`${make.slug}/${model.slug}`, { make, model });
  const name = (make: CarMake, model: CarModel) => (isEn ? `${make.nameEn} ${model.nameEn}` : `${make.nameHe} ${model.nameHe}`);
  const base = (make: CarMake, model: CarModel) => ({
    carName: name(make, model),
    imageUrl: null as string | null,
    logoUrl: make.logoUrl,
    key: `${make.slug}/${model.slug}`,
  });

  // Road-test findings: one random finding from each of a random set of models.
  const synth = await dbAll<{ make_slug: string; model_slug: string; weaknesses: string }>(
    `SELECT make_slug, model_slug, weaknesses FROM model_synthesis ORDER BY RANDOM() LIMIT ${TESTS_WANTED * 2}`,
  ).catch(() => []);
  const tests: HomeIssue[] = [];
  const seenModels = new Set<string>();
  for (const row of synth) {
    const key = `${row.make_slug}/${row.model_slug}`;
    const car = byKey.get(key);
    if (!car || seenModels.has(key)) continue;
    let items: { text_he?: string; text_en?: string; source_site?: string }[] = [];
    try { items = JSON.parse(row.weaknesses); } catch { continue; }
    const usable = items.filter((w) => (isEn ? w.text_en : w.text_he) && w.source_site);
    if (!usable.length) continue;
    const w = usable[Math.floor(Math.random() * usable.length)];
    seenModels.add(key);
    tests.push({
      kind: 'test', href: `/cars/${car.make.slug}/${car.model.slug}/issues`, ...base(car.make, car.model),
      years: yearsOf(car.model), title: (isEn ? w.text_en : w.text_he)!, source: w.source_site!, noticeYear: null,
    });
    if (tests.length >= TESTS_WANTED) break;
  }

  // Israeli recall notices (Hebrew only): the newest recent notice for a random set of
  // models that are common on Israeli roads, limited to the years the site covers.
  const recalls: HomeIssue[] = [];
  if (!isEn) {
    const minYear = new Date().getFullYear() - RECENT_YEARS;
    const candidates = shuffle(
      [...byKey.values()].filter(({ model }) => (model.activeVehiclesIl ?? 0) >= 3000 && model.years.length > 0),
    ).slice(0, RECALLS_WANTED * 2);
    const found = await Promise.all(candidates.map(async ({ make, model }) => {
      const list = await getIsraeliRecalls(make.nameEn, model.nameEn).catch(() => []);
      const r = list.find((x) => (x.year ?? 0) >= minYear && x.faultDescription
        && buildWindowOverlaps(x, Math.min(...model.years), Math.max(...model.years)));
      if (!r) return null;
      const built = buildYearsLabel(r);
      return {
        kind: 'recall' as const, href: `/cars/${make.slug}/${model.slug}/issues`, ...base(make, model),
        years: built ? `שנות ייצור ${built}` : yearsOf(model),
        title: cleanText(r.faultDescription!), source: '', noticeYear: r.year,
      };
    }));
    for (const r of found) if (r && recalls.length < RECALLS_WANTED) recalls.push(r);
  }

  // The same main photo the model page shows (first of its gallery), small.
  const all = interleave(recalls, tests);
  await Promise.all(all.map(async (it) => {
    const [mk, mo] = (it as HomeIssue & { key: string }).key.split('/');
    const img = (await getImagesForCar(mk, mo).catch(() => []))[0];
    it.imageUrl = img ? sizedImageUrl(img.thumbnail_url ?? img.url, 120) ?? img.url : null;
    delete (it as Partial<HomeIssue & { key: string }>).key;
  }));
  return all;
}
