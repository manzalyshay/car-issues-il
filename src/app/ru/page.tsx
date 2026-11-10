import type { Metadata } from 'next';
import Link from 'next/link';
import RuPlateForm from '@/components/ru/RuPlateForm';
import { getAllMakes } from '@/lib/carsDb';
import { resolvePairs } from '@/lib/comparePairs';
import { RU_COMPARE_PAIRS } from '@/data/ru-compare-pairs';
import { dbFirst } from '@/lib/db';
import MakeLogo from '@/components/MakeLogo';
import { RuHero, RuEyebrow, RuSectionHead, RuVsGrid, RuStyles, RU_GUTTER, RU_MAXW } from '@/components/ru/RuUi';

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
  const [makes, recallTotal] = await Promise.all([
    getAllMakes().catch(() => []),
    dbFirst<{ count: number }>('SELECT COUNT(*) AS count FROM recalls_cache').then((r) => r?.count ?? 0).catch(() => 0),
  ]);
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

  const top = pairs.slice(0, 4);
  const featured = pairs.slice(0, 8);
  const rest = pairs.slice(8);

  const stats = [
    { value: brandCount, label: 'марок' },
    { value: modelCount, label: 'моделей' },
    ...(recallTotal > 0 ? [{ value: recallTotal, label: 'отзывных кампаний' }] : []),
    { value: pairs.length, label: 'сравнений на русском' },
  ];
  const checks = ['Бесплатно', 'Без регистрации', 'Данные Министерства транспорта'];

  return (
    <div style={{ direction: 'ltr' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <RuStyles />

      <RuHero padding={`clamp(28px,3.4vw,48px) ${RU_GUTTER} 0`}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(24px,3.4vw,40px)', alignItems: 'stretch' }}>
          <div style={{ flex: '999 1 520px', minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <RuEyebrow>Проверка по номеру · Сравнения · Отзывные кампании</RuEyebrow>
            <h1 style={{ fontWeight: 900, fontSize: 'clamp(26px,3.2vw,42px)', lineHeight: 1.12, letterSpacing: '-.03em', margin: '10px 0 12px', color: '#fff' }}>
              Проверка авто и сравнение автомобилей в Израиле
            </h1>
            <p style={{ color: '#b8c8e4', fontSize: 'clamp(15px,1.2vw,17px)', lineHeight: 1.65, margin: '0 0 22px', maxWidth: 620 }}>
              Отзывы владельцев, типичные проблемы, отзывные кампании и цены по израильским прайс-листам — теперь и на русском.
            </p>
            <div style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 16, padding: 16, maxWidth: 560 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', margin: '0 0 10px' }}>Проверка авто по номеру</h2>
              <RuPlateForm />
            </div>
            <div style={{ display: 'flex', gap: '6px 14px', flexWrap: 'wrap', marginTop: 14 }}>
              {checks.map((c) => (
                <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: '#9fe0b3' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                  {c}
                </span>
              ))}
            </div>
            <p style={{ margin: '14px 0 0', fontSize: 14 }}>
              <Link href="/ru/vehicle-lookup" style={{ color: '#8fb3ff', fontWeight: 600, textDecoration: 'none' }}>Что показывает проверка →</Link>
            </p>
          </div>

          {top.length > 0 && (
            <aside aria-label="Популярные сравнения" style={{ flex: '1 1 360px', minWidth: 0, background: '#1b2b4d', border: '1px solid #2a3c63', borderRadius: 'var(--r)', padding: 22, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff' }}>Чаще всего сравнивают</h2>
                <Link href="#compare" style={{ fontSize: 13.5, color: '#8fb3ff', textDecoration: 'none', whiteSpace: 'nowrap' }}>Все →</Link>
              </div>
              {top.map((p, i) => (
                <Link key={p.path} href={`/ru${p.path}`} className="ru-trend-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 10px', borderRadius: 12, textDecoration: 'none', color: '#fff' }}>
                  <span style={{ width: 20, fontSize: 15, fontWeight: 700, color: '#8fb3ff', textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ display: 'flex', flexShrink: 0 }}>
                    <MakeLogo logoUrl={p.a.make.logoUrl} nameEn={p.a.make.nameEn} size={30} />
                    <span style={{ marginLeft: -8 }}><MakeLogo logoUrl={p.b.make.logoUrl} nameEn={p.b.make.nameEn} size={30} /></span>
                  </span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 700, lineHeight: 1.3 }}>
                    {p.a.make.nameEn} {p.a.model.nameEn} <span style={{ color: '#7a9cc8', fontWeight: 500 }}>vs</span> {p.b.make.nameEn} {p.b.model.nameEn}
                  </span>
                </Link>
              ))}
            </aside>
          )}
        </div>

        <div className="ru-stats" style={{ marginTop: 'clamp(28px,3vw,40px)', borderTop: '1px solid rgba(255,255,255,.1)', display: 'grid', gridTemplateColumns: `repeat(${stats.length}, 1fr)` }}>
          {stats.map((s, i) => (
            <div key={s.label} style={{ padding: '22px 12px', textAlign: 'center', borderLeft: i ? '1px solid rgba(255,255,255,.1)' : 'none' }}>
              <div style={{ fontSize: 'clamp(24px,2.6vw,34px)', fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{s.value.toLocaleString('ru-RU')}</div>
              <div style={{ fontSize: 13, color: '#93a5c0', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </RuHero>

      <div style={{ maxWidth: RU_MAXW, margin: '0 auto', padding: `0 ${RU_GUTTER}` }}>
        <section id="compare" aria-labelledby="ru-compare" style={{ paddingTop: 'clamp(34px,3.6vw,52px)', scrollMarginTop: 80 }}>
          <RuSectionHead id="ru-compare" title="Сравнение автомобилей" sub="Цены по израильскому прайс-листу, мощность, расход, багажник, оценки владельцев и отзывные кампании — и короткий вывод, какая модель получает более высокую оценку." />
          <RuVsGrid pairs={featured} />
        </section>

        {rest.length > 0 && (
          <section aria-labelledby="ru-all" style={{ paddingTop: 'clamp(30px,3vw,44px)' }}>
            <h2 id="ru-all" style={{ fontSize: 18, fontWeight: 800, margin: '0 0 14px' }}>Все сравнения</h2>
            <RuVsGrid pairs={rest} compact min={300} />
          </section>
        )}

        <section style={{ paddingBlock: 'clamp(34px,3.6vw,52px)' }}>
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: 'clamp(18px,2.4vw,24px)', display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', minWidth: 0, flex: '1 1 420px' }}>
              <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🇮🇱</span>
              <p style={{ margin: 0, lineHeight: 1.6, color: 'var(--ink-soft)' }}>
                Отзывы владельцев, страницы {modelCount} моделей и стоимость ремонта пока доступны только на иврите.
              </p>
            </div>
            <Link href="/" hrefLang="he" style={{ fontWeight: 700, fontSize: 14.5, textDecoration: 'none', color: 'var(--accent)', border: '1.5px solid var(--border-strong)', borderRadius: 10, padding: '9px 16px', whiteSpace: 'nowrap' }}>Сайт на иврите →</Link>
          </div>
        </section>
      </div>

      <section style={{ background: '#0d1b2f', color: '#fff', padding: `clamp(40px,4.5vw,64px) ${RU_GUTTER}` }}>
        <div style={{ maxWidth: 820, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontWeight: 900, fontSize: 'clamp(24px,2.8vw,36px)', lineHeight: 1.15, letterSpacing: '-.03em', margin: 0, color: '#fff' }}>
            Покупаете подержанный автомобиль?
          </h2>
          <p style={{ color: '#b8c8e4', fontSize: 'clamp(15px,1.2vw,17px)', margin: '12px 0 22px' }}>
            Техосмотр, история владения, пробег и повреждения по номеру — бесплатно, за несколько секунд.
          </p>
          <Link href="/ru/vehicle-lookup" style={{ display: 'inline-block', background: '#fff', color: '#0d1b2f', fontWeight: 800, fontSize: 16, padding: '13px 30px', borderRadius: 13, textDecoration: 'none' }}>
            Проверить авто по номеру →
          </Link>
        </div>
      </section>

      <style>{`
        .ru-trend-row { transition: background .15s; }
        .ru-trend-row:hover { background: rgba(255,255,255,.06); }
        @media (max-width: 640px) {
          .ru-stats { grid-template-columns: repeat(2, 1fr) !important; }
          .ru-stats > div:nth-child(3) { border-left: none !important; }
          .ru-stats > div:nth-child(n+3) { border-top: 1px solid rgba(255,255,255,.1); }
        }
      `}</style>
    </div>
  );
}
