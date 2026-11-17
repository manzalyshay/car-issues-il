/**
 * Russian compare page (pilot): /ru/cars/compare/{make1}/{model1}/{make2}/{model2}.
 * Only the 50 pairs in RU_COMPARE_PAIRS exist; any other pair is a 404, not a thin page.
 * The page itself is the shared compare page (src/components/compare/ComparePageView.tsx)
 * in Russian; this route sets the Russian metadata, the 404 and the canonical redirect.
 */
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getMakeBySlug, getModelBySlug } from '@/lib/carsDb';
import { RU_COMPARE_PATHS } from '@/data/ru-compare-pairs';
import ComparePageView from '@/components/compare/ComparePageView';

export const revalidate = 3600;

interface Props { params: Promise<{ make1: string; model1: string; make2: string; model2: string }> }

const BASE = 'https://carissues.co.il';

function paths(make1: string, model1: string, make2: string, model2: string) {
  const [c1, c2] = [`${make1}/${model1}`, `${make2}/${model2}`].sort();
  const hePath = `/cars/compare/${c1}/${c2}`;
  return { c1, c2, hePath, ruPath: `/ru${hePath}`, isCanonical: `${make1}/${model1}` === c1 };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { make1, model1, make2, model2 } = await params;
  const { hePath, ruPath } = paths(make1, model1, make2, model2);
  if (!RU_COMPARE_PATHS.has(hePath)) return { robots: { index: false, follow: true } };
  const [mA, mB, modA, modB] = await Promise.all([
    getMakeBySlug(make1), getMakeBySlug(make2), getModelBySlug(make1, model1), getModelBySlug(make2, model2),
  ]);
  if (!mA || !mB || !modA || !modB) return { robots: { index: false, follow: true } };
  const nameA = `${mA.nameEn} ${modA.nameEn}`;
  const nameB = `${mB.nameEn} ${modB.nameEn}`;
  const url = `${BASE}${ruPath}`;
  return {
    title: { absolute: `${nameA} или ${nameB}: что лучше? Сравнение 2026 | CarIssues` },
    description: `${nameA} или ${nameB}? Сравнение для Израиля: цены по прайс-листу, расход, багажник, отзывы владельцев и отзывные кампании. Коротко о том, кому какой автомобиль подходит.`,
    alternates: {
      canonical: url,
      languages: { 'he': `${BASE}${hePath}`, 'ru-IL': url, en: `https://carissues.net${hePath}`, 'x-default': `https://carissues.net${hePath}` },
    },
    openGraph: { title: `${nameA} или ${nameB}: что лучше?`, url, locale: 'ru_IL' },
  };
}

export default async function RuComparePage({ params }: Props) {
  const { make1, model1, make2, model2 } = await params;
  const { hePath, ruPath, isCanonical } = paths(make1, model1, make2, model2);
  if (!RU_COMPARE_PATHS.has(hePath)) notFound();
  if (!isCanonical) permanentRedirect(ruPath);
  return <ComparePageView make1={make1} model1={model1} make2={make2} model2={model2} locale="ru" />;
}
