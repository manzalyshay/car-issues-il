/**
 * "About this model" data for a matched vehicle-lookup result: owner rating, Israeli
 * price, common problems (CarComplaints + AI summary, both source-labelled) and the
 * model's top compare pages. Everything is optional - absent data is simply omitted.
 */
import { getAllMakes } from './carsDb';
import { dbFirst } from './db';
import { getModelPriceMins, getTrimSpecs } from './trimSpecsDb';
import { getExpertReviews } from './expertReviews';
import { getKnownIssues, knownIssueSourceLabel } from './knownIssuesDb';
import { comparePairsForModel } from './comparePairs';
import { aiSourceLabel } from './aiSource';
import { getAiScore, blendWithOwnerRating, type AiConfidence } from './aiScore';
import { getProReviewScoreSets, scoreSetsForPageYear } from './proReviewScores';
import { getRecallsFromCache } from './recallsDb';
import { getIsraeliRecalls } from './israeliRecallsDb';
import { getModelRepairCosts, getRepairCosts } from './repairCostsDb';
import { getReviewsForModel } from './reviewsDb';
import type { Review } from '@/data/reviews';
import { findCarModel, type SketchfabModel } from './sketchfab';
import { type ProReviewScoreSet, headlineTestScoreAvg, blendWithTestScore } from './proReviewScoreLabels';
import { translateTitlesToHebrew } from './translateCache';

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
  aiScore: number | null;
  aiConfidence: AiConfidence | null;
  recallCount: number;
  repairCostTeaser: string | null;
  recentReviews: Review[];
  leadingImageUrl: string | null;
  topProblems: { title: string; severity: 'שכיח' | 'בינוני' }[];
  isHybrid: boolean;
  /** Only set when the vehicle's own year was given and a 3D model actually covers that generation. */
  sketchfabModel: SketchfabModel | null;
  yearsCovered: boolean;
  proReviewScoreSets: ProReviewScoreSet[] | null;
}

// Known-issue titles with no structured powertrain tag that are unambiguously
// diesel-specific terminology (glow plugs, DPF, EGR, AdBlue) - excluded whenever
// the looked-up vehicle's registered fuel is known and isn't diesel, the same
// title-pattern-exclusion idiom already used for images and 3D models.
const DIESEL_ONLY_ISSUE: RegExp[] = [
  /\bglow\s*plug/i, /\bglow\s*light/i, /\bDPF\b/i, /\bdiesel\s*particulate/i,
  /\bEGR\b/i, /\bAdBlue\b/i, /\bturbo\s*diesel\b/i,
];

export async function getModelInfo(
  makeSlug: string, modelSlug: string, locale: 'he' | 'en', vehicleYear?: number | null, vehicleFuel?: string | null,
): Promise<ModelInfo | null> {
  const isEn = locale === 'en';
  const makes = await getAllMakes().catch(() => []);
  const make = makes.find((m) => m.slug === makeSlug);
  const model = make?.models.find((m) => m.slug === modelSlug);
  if (!make || !model) return null;

  const [rating, prices, expert, knownRaw, aiScore, recalls, israeliRecalls, modelRepairCosts, genericRepairCosts, allReviews, trims, proReviewScoreSets, fab] = await Promise.all([
    dbFirst<{ n: number; avg: number | null }>(
      'SELECT COUNT(*) AS n, AVG(rating) AS avg FROM reviews WHERE make_slug = ? AND model_slug = ?', makeSlug, modelSlug,
    ).catch(() => null),
    getModelPriceMins().catch(() => new Map<string, number>()),
    getExpertReviews(makeSlug, modelSlug).catch(() => []),
    getKnownIssues(makeSlug, modelSlug, 3, vehicleYear ?? undefined),
    getAiScore(makeSlug, modelSlug).catch(() => null),
    getRecallsFromCache(make.nameEn, model.nameEn).catch(() => []),
    getIsraeliRecalls(make.nameEn, model.nameEn).catch(() => []),
    getModelRepairCosts(makeSlug, modelSlug).catch(() => []),
    getRepairCosts(model.category).catch(() => []),
    getReviewsForModel(makeSlug, modelSlug).catch(() => []),
    getTrimSpecs(makeSlug, modelSlug).catch(() => []),
    getProReviewScoreSets(makeSlug, modelSlug).catch(() => null),
    findCarModel(makeSlug, modelSlug, vehicleYear ?? undefined).catch(() => null),
  ]);

  // Only surface the 3D model when we know the vehicle's year and the picked
  // entry's own year range actually covers it - findCarModel() otherwise falls
  // back to the nearest entry, which would be a different generation than the
  // car just looked up.
  const sketchfabModel = (() => {
    if (!fab) return null;
    if (!vehicleYear) return fab;
    const covers = fab.yearFrom != null && vehicleYear >= fab.yearFrom && (fab.yearTo == null || vehicleYear <= fab.yearTo);
    return covers ? fab : null;
  })();

  const yearsCovered = (() => {
    if (!vehicleYear || !model.years.length) return true;
    return vehicleYear >= Math.min(...model.years) && vehicleYear <= Math.max(...model.years);
  })();

  // Drop issues that only apply to a powertrain the actual vehicle doesn't have
  // (most known_issues rows carry no structured fuel tag, so this is a title-text
  // exclusion, same idiom as isUnsuitableImage/UNSUITABLE_3D_TITLES elsewhere).
  const isDiesel = vehicleFuel === 'דיזל';
  const known = isDiesel
    ? knownRaw
    : knownRaw.filter((k) => !DIESEL_ONLY_ISSUE.some((re) => re.test(k.title)));

  // known_issues titles are stored in English only (scraped from CarComplaints/NHTSA/etc) -
  // translate for the Hebrew site so a fault list doesn't show untranslated English.
  const knownTitlesHe = !isEn && known.length
    ? await translateTitlesToHebrew(known.map((k) => k.title)).catch(() => known.map((k) => k.title))
    : null;
  const knownTitle = (i: number) => knownTitlesHe?.[i] ?? known[i].title;

  const problems: ModelInfo['problems'] = [];
  if (known.length) {
    problems.push({ items: known.map((k, i) => knownTitle(i)), source: knownIssueSourceLabel(known[0].source), sourceUrl: known[0].sourceUrl, lang: locale });
  }
  const er = expert[0];
  const cons = (isEn ? er?.consEn : er?.cons)?.filter((c) => c && (!isEn || !/[֐-׿]/.test(c))).slice(0, 3) ?? [];
  if (er && cons.length) problems.push({ items: cons, source: aiSourceLabel(er, isEn), sourceUrl: null, lang: locale });

  const self = `${makeSlug}/${modelSlug}`;
  const compares = comparePairsForModel(makes, makeSlug, modelSlug, 3).map((p) => {
    const other = p.a.key === self ? p.b : p.a;
    return { path: p.path, label: isEn ? `vs ${other.make.nameEn} ${other.model.nameEn}` : `מול ${other.make.nameHe} ${other.model.nameHe}` };
  });

  // Professional-review sets can span several generations of the same nameplate
  // (e.g. a leftover score for an old Colt/Panda generation alongside the
  // current one) - restrict to whichever generation is actually relevant here
  // before blending or displaying them, the same way year pages already do
  // via filterScoreSetsForYear.
  const scoreReferenceYear = vehicleYear ?? (model.years.length ? Math.max(...model.years) : null);
  const relevantProReviewScoreSets = proReviewScoreSets && scoreReferenceYear != null
    ? scoreSetsForPageYear(proReviewScoreSets, scoreReferenceYear, model.years.length ? Math.max(...model.years) : null)
    : proReviewScoreSets;

  const avgRatingVal = rating?.n ? rating.avg : null;
  const reviewCountVal = rating?.n ?? 0;
  let blendedScore = aiScore ? blendWithOwnerRating(aiScore.score, avgRatingVal, reviewCountVal) : null;
  // Blend in the verified external test scores (icar, Autocar, carwow, etc.)
  // as one more real input, same treatment as every other score surface.
  if (blendedScore != null && relevantProReviewScoreSets && relevantProReviewScoreSets.length > 0) {
    blendedScore = blendWithTestScore(blendedScore, headlineTestScoreAvg(relevantProReviewScoreSets));
  }

  const topRepair = modelRepairCosts[0] ?? null;
  const genericTopRepair = genericRepairCosts.find((r) => r.cost_min_ils != null) ?? null;
  const repairCostTeaser = topRepair
    ? `${topRepair.repair_name_he}: ₪${topRepair.cost_ils.toLocaleString('he-IL')}`
    : genericTopRepair
      ? `${genericTopRepair.repair_name_he}: ₪${genericTopRepair.cost_min_ils.toLocaleString('he-IL')}-${genericTopRepair.cost_max_ils.toLocaleString('he-IL')}`
      : null;

  const topProblems: ModelInfo['topProblems'] = known.slice(0, 3).map((k, i) => ({
    title: knownTitle(i),
    severity: k.rank === 1 ? 'שכיח' : 'בינוני',
  }));

  return {
    makeSlug, modelSlug,
    name: isEn ? `${make.nameEn} ${model.nameEn}` : `${make.nameHe} ${model.nameHe}`,
    modelUrl: `/cars/${makeSlug}/${modelSlug}`,
    issuesUrl: `/cars/${makeSlug}/${modelSlug}/issues`,
    avgRating: avgRatingVal,
    reviewCount: reviewCountVal,
    priceMin: prices.get(self) ?? null,
    problems,
    compares,
    aiScore: blendedScore,
    aiConfidence: aiScore?.confidence ?? null,
    recallCount: recalls.length + israeliRecalls.length,
    repairCostTeaser,
    recentReviews: allReviews.slice(0, 2),
    leadingImageUrl: model.leadingImageUrl ?? null,
    topProblems,
    isHybrid: trims.some((t) => t.engineType === 'hybrid'),
    sketchfabModel,
    yearsCovered,
    proReviewScoreSets: relevantProReviewScoreSets,
  };
}
