/**
 * Russian compare page (pilot): /ru/cars/compare/{make1}/{model1}/{make2}/{model2}.
 * Only the 50 pairs in RU_COMPARE_PAIRS exist; any other pair is a 404, not a thin page.
 * Every sentence is built from data the site has (Israeli trim prices and specs, owner
 * reviews, US recall records) with the same rules as the Hebrew compare page. Pros and
 * cons exist only in Hebrew/English, so they are shown in English and labelled as such.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { getMakeBySlug, getModelBySlug, getAllMakes } from '@/lib/carsDb';
import { getReviewsForModel } from '@/lib/reviewsDb';
import { getExpertReviews } from '@/lib/expertReviews';
import { getTrimSpecs, type TrimSpecWithYear } from '@/lib/trimSpecsDb';
import { getRecallsFromCache } from '@/lib/recallsDb';
import { normEngine } from '@/lib/specSummary';
import { realItems } from '@/lib/faqData';
import { resolvePairs } from '@/lib/comparePairs';
import { RU_COMPARE_PAIRS, RU_COMPARE_PATHS } from '@/data/ru-compare-pairs';
import { ruCount, ruPluralIndex } from '@/lib/translations.ru';

export const revalidate = 3600;

interface Props { params: Promise<{ make1: string; model1: string; make2: string; model2: string }> }

const BASE = 'https://carissues.co.il';
const HEBREW = /[֐-׿]/;

/** Russian category names for car_models.category. */
const CATEGORY_RU: Record<string, string> = {
  sedan: 'седан', suv: 'кроссовер / SUV', hatchback: 'хэтчбек', pickup: 'пикап', van: 'фургон / минивэн', coupe: 'купе', electric: 'электромобиль',
};

const ils = (v: number) => `₪${Math.round(v).toLocaleString('ru-RU')}`;
/** One decimal with a Russian decimal comma: 15,2 */
const n1 = (v: number) => v.toFixed(1).replace('.', ',');
const nearlyEqual = (a: number, b: number) => Math.abs(a - b) / Math.max(a, b) < 0.02;

async function load(make1: string, model1: string, make2: string, model2: string) {
  const [mA, mB, modA, modB] = await Promise.all([
    getMakeBySlug(make1), getMakeBySlug(make2), getModelBySlug(make1, model1), getModelBySlug(make2, model2),
  ]);
  if (!mA || !mB || !modA || !modB) return null;
  const [reviewsA, reviewsB, expertA, expertB, trimsA, trimsB, recallsA, recallsB] = await Promise.all([
    getReviewsForModel(make1, model1).catch(() => []),
    getReviewsForModel(make2, model2).catch(() => []),
    getExpertReviews(make1, model1).catch(() => []),
    getExpertReviews(make2, model2).catch(() => []),
    getTrimSpecs(make1, model1).catch(() => [] as TrimSpecWithYear[]),
    getTrimSpecs(make2, model2).catch(() => [] as TrimSpecWithYear[]),
    getRecallsFromCache(mA.nameEn, modA.nameEn).catch(() => []),
    getRecallsFromCache(mB.nameEn, modB.nameEn).catch(() => []),
  ]);
  return { mA, mB, modA, modB, reviewsA, reviewsB, expertA, expertB, trimsA, trimsB, recallsA, recallsB };
}

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

  const d = await load(make1, model1, make2, model2);
  if (!d) notFound();
  const { mA, mB, modA, modB, reviewsA, reviewsB, expertA, expertB, trimsA, trimsB, recallsA, recallsB } = d;
  const nameA = `${mA.nameEn} ${modA.nameEn}`;
  const nameB = `${mB.nameEn} ${modB.nameEn}`;

  // ── Numbers (same rules as the Hebrew compare page) ─────────────────────────────
  const avg = (rs: { rating: number }[]) => (rs.length ? rs.reduce((s, r) => s + r.rating, 0) / rs.length : null);
  const avgA = avg(reviewsA);
  const avgB = avg(reviewsB);
  const scoreA = expertA[0]?.topScore ?? null;
  const scoreB = expertB[0]?.topScore ?? null;
  const better = (a: number | null, b: number | null): 'a' | 'b' | 'tie' | null => {
    if (a === null && b === null) return null;
    if (a === null) return 'b';
    if (b === null) return 'a';
    if (Math.abs(a - b) < 0.15) return 'tie';
    return a > b ? 'a' : 'b';
  };
  const maxVal = (ts: TrimSpecWithYear[], k: keyof TrimSpecWithYear) =>
    ts.reduce((best: number | null, t) => { const v = t[k] as number | undefined; return v == null ? best : best === null || v > best ? v : best; }, null);
  const minVal = (ts: TrimSpecWithYear[], k: keyof TrimSpecWithYear) =>
    ts.reduce((best: number | null, t) => { const v = t[k] as number | undefined; return v == null ? best : best === null || v < best ? v : best; }, null);
  const consumption = (ts: TrimSpecWithYear[]) => {
    const electric = ts.filter((t) => normEngine(t.engineType) === 'electric' && typeof t.fuelConsumption === 'number' && t.fuelConsumption > 0 && t.fuelConsumption <= 50);
    const combustion = ts.filter((t) => { const e = normEngine(t.engineType); return (e === 'petrol' || e === 'hybrid' || e === 'diesel') && typeof t.fuelConsumption === 'number' && t.fuelConsumption >= 3 && t.fuelConsumption <= 20; });
    if (combustion.length) { const v = combustion.map((t) => 100 / t.fuelConsumption!); return { kind: 'fuel' as const, score: v.reduce((s, x) => s + x, 0) / v.length, min: Math.min(...v), max: Math.max(...v) }; }
    if (electric.length) { const v = electric.map((t) => t.fuelConsumption!); return { kind: 'electric' as const, score: v.reduce((s, x) => s + x, 0) / v.length, min: Math.min(...v), max: Math.max(...v) }; }
    return null;
  };
  const consA = consumption(trimsA);
  const consB = consumption(trimsB);
  const fmtCons = (c: NonNullable<typeof consA>) => (c.min === c.max ? n1(c.min) : `${n1(c.min)}–${n1(c.max)}`);
  const consUnit = (k: 'fuel' | 'electric') => (k === 'electric' ? 'кВт·ч/100 км' : 'км/л');
  const pos = (v: number | null) => (v != null && v > 0 ? v : null);
  const priceA = pos(minVal(trimsA, 'priceIls'));
  const priceB = pos(minVal(trimsB, 'priceIls'));
  const cargoA = pos(maxVal(trimsA, 'cargoLiters'));
  const cargoB = pos(maxVal(trimsB, 'cargoLiters'));
  const hpA = pos(maxVal(trimsA, 'engineHp'));
  const hpB = pos(maxVal(trimsB, 'engineHp'));
  const accA = pos(minVal(trimsA, 'acceleration'));
  const accB = pos(minVal(trimsB, 'acceleration'));

  // ── Verdict and facts ──────────────────────────────────────────────────────────
  const hasVerdict = scoreA !== null || scoreB !== null || avgA !== null || avgB !== null;
  const winner = better(scoreA, scoreB) ?? better(avgA, avgB);
  const [winName, loseName] = winner === 'a' ? [nameA, nameB] : winner === 'b' ? [nameB, nameA] : [null, null];
  const basis = reviewsA.length > 0 || reviewsB.length > 0 ? 'По отзывам владельцев и оценкам экспертов' : 'По тестам и официальным данным';
  type Fact = { sentence: string; faq: { q: string; a: string } };

  const priceFact: Fact | null = priceA !== null && priceB !== null ? (() => {
    const q = `Что дешевле: ${nameA} или ${nameB}?`;
    if (nearlyEqual(priceA, priceB)) {
      const a = `Цены почти одинаковые: ${nameA} — от ${ils(priceA)}, ${nameB} — от ${ils(priceB)} (начальная цена по израильскому прайс-листу).`;
      return { sentence: a, faq: { q, a } };
    }
    const [cn, cp, en, ep] = priceA < priceB ? [nameA, priceA, nameB, priceB] : [nameB, priceB, nameA, priceA];
    return {
      sentence: `${cn} дешевле: от ${ils(cp)} против ${ils(ep)}.`,
      faq: { q, a: `${cn} дешевле: от ${ils(cp)}, у ${en} — от ${ils(ep)}. Разница — ${ils(ep - cp)} (начальная цена по израильскому прайс-листу).` },
    };
  })() : null;

  const fuelFact: Fact | null = consA && consB && consA.kind === consB.kind ? (() => {
    const unit = consUnit(consA.kind);
    const figures = `${fmtCons(consA)} ${unit} у ${nameA} против ${fmtCons(consB)} ${unit} у ${nameB}`;
    const q = consA.kind === 'electric' ? `Кто расходует меньше электроэнергии: ${nameA} или ${nameB}?` : `Кто экономичнее: ${nameA} или ${nameB}?`;
    if (nearlyEqual(consA.score, consB.score)) {
      const a = `Расход почти одинаковый: ${figures}.`;
      return { sentence: a, faq: { q, a } };
    }
    const aWins = consA.kind === 'electric' ? consA.score < consB.score : consA.score > consB.score;
    const wn = aWins ? nameA : nameB;
    const a = consA.kind === 'electric' ? `${wn} расходует меньше электроэнергии: ${figures}.` : `${wn} экономичнее: ${figures}.`;
    return { sentence: a, faq: { q, a } };
  })() : null;

  const spaceFact: Fact | null = cargoA !== null && cargoB !== null ? (() => {
    const q = `Кто просторнее: ${nameA} или ${nameB}?`;
    const l = (v: number) => `${Math.round(v)} л`;
    if (nearlyEqual(cargoA, cargoB)) {
      const a = `Багажники почти одинаковые: ${l(cargoA)} у ${nameA} и ${l(cargoB)} у ${nameB}.`;
      return { sentence: a, faq: { q, a } };
    }
    const [wn, wv, ln, lv] = cargoA > cargoB ? [nameA, cargoA, nameB, cargoB] : [nameB, cargoB, nameA, cargoA];
    return {
      sentence: `У ${wn} багажник больше (${l(wv)} против ${l(lv)}).`,
      faq: { q, a: `По объёму багажника ${wn} просторнее: ${l(wv)} против ${l(lv)} у ${ln}.` },
    };
  })() : null;

  const recallFaq = recallsA.length > 0 && recallsB.length > 0 ? {
    q: `Сколько отзывных кампаний было у ${nameA} и ${nameB}?`,
    a: `В американской базе отзывных кампаний (NHTSA) у ${nameA} ${recallsA.length} ${['кампания', 'кампании', 'кампаний'][ruPluralIndex(recallsA.length)]}, у ${nameB} — ${recallsB.length}. Кампания в США не всегда относится к автомобилям, проданным в Израиле.`,
  } : null;

  const ownersFaq = avgA !== null && avgB !== null && reviewsA.length >= 3 && reviewsB.length >= 3 ? {
    q: `Как владельцы оценивают ${nameA} и ${nameB}?`,
    a: `Средняя оценка владельцев на CarIssues: ${nameA} — ${n1(avgA)} из 5 (${ruCount(reviewsA.length, 'makePage.reviews')}), ${nameB} — ${n1(avgB)} из 5 (${ruCount(reviewsB.length, 'makePage.reviews')}).`,
  } : null;

  const faq = [priceFact?.faq, fuelFact?.faq, spaceFact?.faq, ownersFaq, recallFaq].filter((f): f is { q: string; a: string } => !!f);
  const verdictLead = !hasVerdict ? null
    : winName ? `${basis} ${winName} получает более высокую оценку, чем ${loseName}.`
    : 'Обе модели получают очень близкие общие оценки.';
  const shortFacts = [priceFact, fuelFact, spaceFact].filter((f): f is Fact => !!f).slice(0, 2).map((f) => f.sentence);

  // Pros/cons exist only in Hebrew and English: show the English ones, labelled
  const en = (xs: string[] | undefined) => realItems(xs ?? []).filter((x) => !HEBREW.test(x)).slice(0, 4);
  const sides = [
    { name: nameA, mk: mA, md: modA, pros: en(expertA[0]?.prosEn), cons: en(expertA[0]?.consEn) },
    { name: nameB, mk: mB, md: modB, pros: en(expertB[0]?.prosEn), cons: en(expertB[0]?.consEn) },
  ];
  const hasProsCons = sides.some((s) => s.pros.length || s.cons.length);

  // Table rows: shown only when at least one side has the number
  const rows: { label: string; a: string | null; b: string | null }[] = [
    { label: 'Класс', a: CATEGORY_RU[modA.category] ?? null, b: CATEGORY_RU[modB.category] ?? null },
    { label: 'Цена от (прайс-лист в Израиле)', a: priceA ? ils(priceA) : null, b: priceB ? ils(priceB) : null },
    { label: 'Мощность, до', a: hpA ? `${Math.round(hpA)} л.с.` : null, b: hpB ? `${Math.round(hpB)} л.с.` : null },
    { label: 'Разгон 0–100 км/ч', a: accA ? `${n1(accA)} с` : null, b: accB ? `${n1(accB)} с` : null },
    { label: 'Расход', a: consA ? `${fmtCons(consA)} ${consUnit(consA.kind)}` : null, b: consB ? `${fmtCons(consB)} ${consUnit(consB.kind)}` : null },
    { label: 'Багажник', a: cargoA ? `${Math.round(cargoA)} л` : null, b: cargoB ? `${Math.round(cargoB)} л` : null },
    { label: 'Оценка владельцев', a: avgA !== null ? `${n1(avgA)} из 5 (${ruCount(reviewsA.length, 'makePage.reviews')})` : null, b: avgB !== null ? `${n1(avgB)} из 5 (${ruCount(reviewsB.length, 'makePage.reviews')})` : null },
    { label: 'Отзывные кампании (США)', a: recallsA.length ? String(recallsA.length) : null, b: recallsB.length ? String(recallsB.length) : null },
  ].filter((r) => r.a !== null || r.b !== null);

  // Other Russian comparisons with either car
  const makes = await getAllMakes().catch(() => []);
  const keyA = `${make1}/${model1}`;
  const keyB = `${make2}/${model2}`;
  const related = resolvePairs(makes, RU_COMPARE_PAIRS)
    .filter((p) => p.path !== hePath && [p.a.key, p.b.key].some((k) => k === keyA || k === keyB))
    .slice(0, 8);

  const url = `${BASE}${ruPath}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Главная', item: `${BASE}/ru` },
          { '@type': 'ListItem', position: 2, name: 'Сравнение автомобилей', item: `${BASE}/ru#compare` },
          { '@type': 'ListItem', position: 3, name: `${nameA} или ${nameB}`, item: url },
        ],
      },
      ...(faq.length ? [{
        '@type': 'FAQPage', inLanguage: 'ru',
        mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      }] : []),
    ],
  };

  const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 'clamp(16px,3vw,24px)' };

  return (
    <div className="container" style={{ direction: 'ltr', paddingBlock: '32px 64px', display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 980 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav aria-label="Навигация" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <Link href="/ru" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Главная</Link><span>›</span>
        <Link href="/ru#compare" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Сравнение автомобилей</Link><span>›</span>
        <span style={{ color: 'var(--text)' }}>{nameA} или {nameB}</span>
      </nav>

      <div>
        <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.1rem)', fontWeight: 800, lineHeight: 1.2, margin: '0 0 8px' }}>{nameA} или {nameB}: что лучше?</h1>
        {(verdictLead || shortFacts.length > 0) && (
          <p style={{ margin: 0, fontSize: '1.02rem', lineHeight: 1.7 }}>
            <strong>Коротко: </strong>{[verdictLead, ...shortFacts].filter(Boolean).join(' ')}
          </p>
        )}
      </div>

      {rows.length > 0 && (
        <section style={card} aria-labelledby="ru-figures">
          <h2 id="ru-figures" style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 12px' }}>Основные цифры</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem', fontVariantNumeric: 'tabular-nums' }}>
              <thead>
                <tr>
                  <th scope="col" style={{ textAlign: 'left', padding: '8px 6px', color: 'var(--text-muted)', fontWeight: 500 }}></th>
                  <th scope="col" style={{ textAlign: 'left', padding: '8px 6px' }}>{nameA}</th>
                  <th scope="col" style={{ textAlign: 'left', padding: '8px 6px' }}>{nameB}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label} style={{ borderTop: '1px solid var(--border)' }}>
                    <th scope="row" style={{ textAlign: 'left', padding: '9px 6px', color: 'var(--text-muted)', fontWeight: 500 }}>{r.label}</th>
                    <td style={{ padding: '9px 6px', fontWeight: 600 }}>{r.a ?? '—'}</td>
                    <td style={{ padding: '9px 6px', fontWeight: 600 }}>{r.b ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '10px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Цифры из прайс-листов импортёров и характеристик комплектаций на CarIssues; «—» значит, что данных нет.
          </p>
        </section>
      )}

      {hasProsCons && (
        <section style={card} aria-labelledby="ru-proscons">
          <h2 id="ru-proscons" style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 4px' }}>Плюсы и минусы</h2>
          <p style={{ margin: '0 0 14px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Из обзоров и отзывов владельцев; на английском языке.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
            {sides.map((s) => (
              <div key={s.name} style={{ minWidth: 0 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>{s.name}</h3>
                {s.pros.length > 0 && <ul lang="en" style={{ margin: '0 0 8px', paddingLeft: 18, lineHeight: 1.6, fontSize: '0.9rem' }}>{s.pros.map((p) => <li key={p}>+ {p}</li>)}</ul>}
                {s.cons.length > 0 && <ul lang="en" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6, fontSize: '0.9rem', color: 'var(--text-muted)' }}>{s.cons.map((c) => <li key={c}>− {c}</li>)}</ul>}
              </div>
            ))}
          </div>
        </section>
      )}

      {faq.length > 0 && (
        <section aria-labelledby="ru-faq">
          <h2 id="ru-faq" style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 12px' }}>Частые вопросы</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {faq.map((f) => (
              <div key={f.q} style={card}>
                <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: '0 0 6px' }}>{f.q}</h3>
                <p style={{ margin: 0, lineHeight: 1.7, color: 'var(--text-muted)', fontSize: '0.92rem' }}>{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section style={card} aria-labelledby="ru-more">
        <h2 id="ru-more" style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 10px' }}>Подробнее</h2>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9, fontSize: '0.92rem' }}>
          {sides.map((s) => (
            <li key={s.name}><Link href={`/cars/${s.mk.slug}/${s.md.slug}`} hrefLang="he">{s.name}: отзывы, проблемы и цены (на иврите)</Link></li>
          ))}
          <li><Link href={hePath} hrefLang="he">Это сравнение на иврите</Link></li>
          <li><Link href="/ru/vehicle-lookup">Проверка авто по номеру перед покупкой</Link></li>
        </ul>
      </section>

      {related.length > 0 && (
        <section aria-labelledby="ru-related">
          <h2 id="ru-related" style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 10px' }}>Похожие сравнения</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {related.map((p) => (
              <Link key={p.path} href={`/ru${p.path}`} className="card" style={{ padding: '11px 14px', textDecoration: 'none', color: 'var(--text)', fontSize: '0.9rem', fontWeight: 600 }}>
                {p.a.make.nameEn} {p.a.model.nameEn} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>или</span> {p.b.make.nameEn} {p.b.model.nameEn}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
