import { getAllMakes, getPopularMakes } from '@/lib/carsDb';
import { getServiceClient } from '@/lib/adminAuth';
import HomeClient from '@/components/HomeClient';

export const dynamic = 'force-dynamic';

async function getTopRanked(limit = 3) {
  const sb = getServiceClient();
  const makes = await getAllMakes();
  const lookup = new Map<string, { makeHe: string; modelHe: string; makeEn: string; modelEn: string; logoUrl: string }>();
  for (const make of makes)
    for (const model of make.models)
      lookup.set(`${make.slug}/${model.slug}`, { makeHe: make.nameHe, modelHe: model.nameHe, makeEn: make.nameEn, modelEn: model.nameEn, logoUrl: make.logoUrl });

  const [{ data: expertData }, { data: reviewData }] = await Promise.all([
    sb.from('expert_reviews').select('make_slug,model_slug,top_score').is('year', null).not('top_score', 'is', null),
    sb.from('reviews').select('make_slug,model_slug,rating'),
  ]);

  const scoreMap = new Map<string, number>();
  for (const row of expertData ?? []) scoreMap.set(`${row.make_slug}/${row.model_slug}`, row.top_score);
  const reviewMap = new Map<string, number[]>();
  for (const row of reviewData ?? []) {
    const key = `${row.make_slug}/${row.model_slug}`;
    if (!reviewMap.has(key)) reviewMap.set(key, []);
    reviewMap.get(key)!.push(row.rating);
  }

  const ranked: { makeSlug: string; modelSlug: string; makeHe: string; modelHe: string; makeEn: string; modelEn: string; logoUrl: string; combined: number; avgRating: number | null }[] = [];
  for (const [key, info] of lookup.entries()) {
    const topScore = scoreMap.get(key) ?? null;
    const ratings = reviewMap.get(key) ?? [];
    const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    const scores: number[] = [];
    if (topScore != null) scores.push(topScore);
    if (avgRating != null) scores.push(avgRating * 2);
    if (!scores.length) continue;
    const combined = scores.reduce((a, b) => a + b, 0) / scores.length;
    const [makeSlug, modelSlug] = key.split('/');
    ranked.push({ makeSlug, modelSlug, ...info, combined, avgRating });
  }
  ranked.sort((a, b) => b.combined - a.combined);
  return ranked.slice(0, limit);
}

async function getRecentReviews(limit = 3) {
  const sb = getServiceClient();
  const makes = await getAllMakes();
  const lookup = new Map<string, { makeHe: string; modelHe: string; makeEn: string; modelEn: string; logoUrl: string }>();
  for (const make of makes)
    for (const model of make.models)
      lookup.set(`${make.slug}/${model.slug}`, { makeHe: make.nameHe, modelHe: model.nameHe, makeEn: make.nameEn, modelEn: model.nameEn, logoUrl: make.logoUrl });

  const { data } = await sb
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data ?? []).map((r: any) => ({
    ...r,
    ...(lookup.get(`${r.make_slug}/${r.model_slug}`) ?? { makeHe: r.make_slug, modelHe: r.model_slug, makeEn: r.make_slug, modelEn: r.model_slug, logoUrl: '' }),
  }));
}

export default async function HomePage() {
  const [popularMakes, allMakes, topRanked, recentReviews] = await Promise.all([
    getPopularMakes().catch(() => []),
    getAllMakes().catch(() => []),
    getTopRanked(3).catch(() => []),
    getRecentReviews(3).catch(() => []),
  ]);

  return (
    <HomeClient
      popularMakes={popularMakes}
      allMakes={allMakes}
      topRanked={topRanked}
      recentReviews={recentReviews}
    />
  );
}
