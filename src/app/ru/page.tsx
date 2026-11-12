import type { Metadata } from 'next';
import { getAllMakes } from '@/lib/carsDb';
import { resolvePairs } from '@/lib/comparePairs';
import { RU_COMPARE_PAIRS } from '@/data/ru-compare-pairs';
import HomePage from '@/components/home/HomePage';

export const revalidate = 3600;

const BASE = 'https://carissues.co.il';

export const metadata: Metadata = {
  title: { absolute: 'CarIssues на русском: проверка авто по номеру и сравнение автомобилей в Израиле' },
  description: 'Бесплатная проверка автомобиля по израильскому номеру и сравнения популярных моделей: цены в Израиле, расход, багажник, отзывы владельцев и отзывные кампании.',
  alternates: {
    canonical: `${BASE}/ru`,
    languages: { 'he': BASE, 'ru-IL': `${BASE}/ru`, en: 'https://carissues.net', 'x-default': 'https://carissues.net' },
  },
  openGraph: { title: 'CarIssues на русском', url: `${BASE}/ru`, locale: 'ru_IL' },
};

/** Russian home page (/ru): the shared home page in Russian, plus its own metadata and list schema. */
export default async function RuHomePage() {
  const makes = await getAllMakes().catch(() => []);
  const pairs = resolvePairs(makes, RU_COMPARE_PAIRS);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ItemList', name: 'Сравнения автомобилей', inLanguage: 'ru',
        itemListElement: pairs.map((p, i) => ({
          '@type': 'ListItem', position: i + 1,
          name: `${p.a.make.nameEn} ${p.a.model.nameEn} или ${p.b.make.nameEn} ${p.b.model.nameEn}`,
          url: `${BASE}/ru${p.path}`,
        })),
      },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <HomePage locale="ru" />
    </>
  );
}
