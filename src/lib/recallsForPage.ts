/**
 * Recalls for a model, shaped like the /api/recalls response, loaded on the server so
 * the problems tab is part of the page HTML instead of being fetched after a click.
 * Israeli notices (Hebrew site only) come first, then the cached US recalls. Both are
 * limited to the model years the site covers.
 */
import type { Recall } from '@/app/api/recalls/route';
import { getIsraeliRecalls, buildWindowOverlaps } from './israeliRecallsDb';
import { getRecallsFromCache } from './recallsDb';

/** Stored components can be a full NHTSA path ("A:B:C") - keep the most specific part. */
const lastSegment = (raw: string | null | undefined): string => {
  const parts = (raw ?? '').split(':');
  return parts[parts.length - 1].trim();
};

export async function getRecallsForPage(
  makeEn: string, modelEn: string, years: number[], locale: 'he' | 'en',
): Promise<Recall[]> {
  const isEn = locale === 'en';
  const [il, us] = await Promise.all([
    isEn ? Promise.resolve([]) : getIsraeliRecalls(makeEn, modelEn).catch(() => []),
    getRecallsFromCache(makeEn, modelEn).catch(() => []),
  ]);
  const ilInRange = years.length
    ? il.filter((r) => buildWindowOverlaps(r, Math.min(...years), Math.max(...years)))
    : il;

  const ilRows: Recall[] = ilInRange.map((r) => ({
    id: r.id,
    year: null,
    date: '',
    component: r.faultType ?? '',
    componentEn: '',
    summary: r.faultDescription ?? '',
    consequence: '',
    remedy: r.fixMethod ?? '',
    manufacturer: r.manufacturer,
    source: 'il',
    importer: r.importer,
    website: r.website,
    ilRecallYear: r.year,
    buildBegin: r.buildBegin,
    buildEnd: r.buildEnd,
    recallType: r.recallType,
  }));

  // Only recalls for model years the site covers; a recall with no recorded year is kept.
  const usInRange = years.length
    ? us.filter((c) => c.recall_year == null || (c.recall_year >= Math.min(...years) && c.recall_year <= Math.max(...years)))
    : us;

  const usRows: Recall[] = usInRange.map((c) => {
    const compEn = lastSegment(c.component_en);
    return {
      id: c.id,
      year: c.recall_year ?? null,
      date: c.date ?? '',
      component: isEn ? compEn : (lastSegment(c.component_he) || compEn),
      componentEn: compEn,
      summary: (isEn ? c.summary_en : (c.summary_he || c.summary_en)) ?? '',
      consequence: (isEn ? c.consequence_en : (c.consequence_he || c.consequence_en)) ?? '',
      remedy: (isEn ? c.remedy_en : (c.remedy_he || c.remedy_en)) ?? '',
      manufacturer: c.manufacturer ?? '',
      source: 'us',
    };
  });

  return [...ilRows, ...usRows];
}
