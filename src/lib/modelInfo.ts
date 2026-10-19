/**
 * "About this model" data for a matched vehicle-lookup result: owner rating, Israeli
 * price, common problems (CarComplaints + AI summary, both source-labelled) and the
 * model's top compare pages. Everything is optional — absent data is simply omitted.
 */
import { getAllMakes } from './carsDb';
import { dbFirst } from './db';
import { getModelPriceMins } from './trimSpecsDb';
import { getExpertReviews } from './expertReviews';
import { getKnownIssues, knownIssueSourceLabel } from './knownIssuesDb';
import { comparePairsForModel } from './comparePairs';
import { aiSourceLabel } from './aiSource';

export interface ModelInfo {
  makeSlug: string;
  modelSlug: string;
  name: string;
  modelUrl: string;
  issuesUrl: string;
  avgRating: number | null;
  reviewCount: number;
  priceMin: number | null;
  problems: { items: string[]; source: string; sourceUrl: string | null; lang: 'he' | 'en' }[];
  compares: { path: string; label: string }[];
}

export async function getModelInfo(makeSlug: string, modelSlug: string, locale: 'he' | 'en'): Promise<ModelInfo | null> {
  const isEn = locale === 'en';
  const makes = await getAllMakes().catch(() => []);
  const make = makes.find((m) => m.slug === makeSlug);
  const model = make?.models.find((m) => m.slug === modelSlug);
  if (!make || !model) return null;

  const [rating, prices, expert, known] = await Promise.all([
    dbFirst<{ n: number; avg: number | null }>(
      'SELECT COUNT(*) AS n, AVG(rating) AS avg FROM reviews WHERE make_slug = ? AND model_slug = ?', makeSlug, modelSlug,
    ).catch(() => null),
    getModelPriceMins().catch(() => new Map<string, number>()),
    getExpertReviews(makeSlug, modelSlug).catch(() => []),
    getKnownIssues(makeSlug, modelSlug, 3),
  ]);

  const problems: ModelInfo['problems'] = [];
  if (known.length) {
    problems.push({ items: known.map((k) => k.title), source: knownIssueSourceLabel(known[0].source), sourceUrl: known[0].sourceUrl, lang: 'en' });
  }
  const er = expert[0];
  const cons = (isEn ? er?.consEn : er?.cons)?.filter((c) => c && (!isEn || !/[֐-׿]/.test(c))).slice(0, 3) ?? [];
  if (er && cons.length) problems.push({ items: cons, source: aiSourceLabel(er, isEn), sourceUrl: null, lang: locale });

  const self = `${makeSlug}/${modelSlug}`;
  const compares = comparePairsForModel(makes, makeSlug, modelSlug, 3).map((p) => {
    const other = p.a.key === self ? p.b : p.a;
    return { path: p.path, label: isEn ? `vs ${other.make.nameEn} ${other.model.nameEn}` : `מול ${other.make.nameHe} ${other.model.nameHe}` };
  });

  return {
    makeSlug, modelSlug,
    name: isEn ? `${make.nameEn} ${model.nameEn}` : `${make.nameHe} ${model.nameHe}`,
    modelUrl: `/cars/${makeSlug}/${modelSlug}`,
    issuesUrl: `/cars/${makeSlug}/${modelSlug}/issues`,
    avgRating: rating?.n ? rating.avg : null,
    reviewCount: rating?.n ?? 0,
    priceMin: prices.get(self) ?? null,
    problems,
    compares,
  };
}
