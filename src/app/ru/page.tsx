import type { Metadata } from 'next';
import Link from 'next/link';
import RuPlateForm from '@/components/ru/RuPlateForm';
import { getAllMakes } from '@/lib/carsDb';
import { resolvePairs } from '@/lib/comparePairs';
import { RU_COMPARE_PAIRS } from '@/data/ru-compare-pairs';

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

export default async function RuHomePage() {
  const makes = await getAllMakes().catch(() => []);
  const pairs = resolvePairs(makes, RU_COMPARE_PAIRS);
  const brandCount = makes.length;
  const modelCount = makes.reduce((s, m) => s + m.models.length, 0);

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
    <div style={{ direction: 'ltr' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', padding: '44px 0 40px' }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <h1 style={{ fontSize: 'clamp(1.6rem, 4.5vw, 2.4rem)', fontWeight: 800, color: '#f1f5f9', lineHeight: 1.2, margin: '0 0 12px' }}>
            Проверка авто и сравнение автомобилей в Израиле
          </h1>
          <p style={{ color: '#a5b4c8', fontSize: '1.02rem', lineHeight: 1.7, margin: '0 0 22px', maxWidth: 620 }}>
            CarIssues собирает отзывы владельцев, типичные проблемы, отзывные кампании и цены по прайс-листам в Израиле: {brandCount} марок и {modelCount} моделей. На русском пока доступны проверка по номеру и самые популярные сравнения.
          </p>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0', margin: '0 0 10px' }}>Проверка авто по номеру</h2>
          <RuPlateForm />
          <p style={{ margin: '12px 0 0', fontSize: '0.85rem' }}>
            <Link href="/ru/vehicle-lookup" style={{ color: '#93c5fd', fontWeight: 600, textDecoration: 'none' }}>Что показывает проверка →</Link>
          </p>
        </div>
      </section>

      <section id="compare" className="container" style={{ maxWidth: 980, paddingBlock: '40px 0', scrollMarginTop: 80 }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 8px' }}>Сравнение автомобилей</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, margin: '0 0 18px', maxWidth: 700 }}>
          В каждом сравнении — цены по израильскому прайс-листу, мощность, расход, объём багажника, оценки владельцев и отзывные кампании, а также короткий вывод о том, какая модель получает более высокую оценку.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {pairs.map((p) => (
            <Link key={p.path} href={`/ru${p.path}`} className="card" style={{ padding: '12px 14px', textDecoration: 'none', color: 'var(--text)', fontSize: '0.92rem', fontWeight: 600 }}>
              {p.a.make.nameEn} {p.a.model.nameEn} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>или</span> {p.b.make.nameEn} {p.b.model.nameEn}
            </Link>
          ))}
        </div>
      </section>

      <section className="container" style={{ maxWidth: 980, paddingBlock: '40px 64px' }}>
        <div className="card" style={{ padding: '18px 20px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ margin: 0, maxWidth: 640, lineHeight: 1.6 }}>
            Отзывы владельцев, страницы моделей и стоимость ремонта пока доступны только на иврите.
          </p>
          <Link href="/" hrefLang="he" style={{ fontWeight: 700, textDecoration: 'none' }}>Перейти на сайт на иврите →</Link>
        </div>
      </section>
    </div>
  );
}
