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
import MakeLogo from '@/components/MakeLogo';
import { RuVsGrid, RuStyles } from '@/components/ru/RuUi';

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

  // Table rows: shown only when at least one side has the number. `better` says which
  // direction wins, so the row can mark the leader and draw proportional bars.
  type Row = { label: string; a: string | null; b: string | null; av?: number | null; bv?: number | null; better?: 'high' | 'low' };
  const consBetter: 'high' | 'low' = consA?.kind === 'electric' ? 'low' : 'high';
  const sameConsKind = consA && consB && consA.kind === consB.kind;
  const rows: Row[] = ([
    { label: 'Класс', a: CATEGORY_RU[modA.category] ?? null, b: CATEGORY_RU[modB.category] ?? null },
    { label: 'Цена от (прайс-лист в Израиле)', a: priceA ? ils(priceA) : null, b: priceB ? ils(priceB) : null, av: priceA, bv: priceB, better: 'low' },
    { label: 'Мощность, до', a: hpA ? `${Math.round(hpA)} л.с.` : null, b: hpB ? `${Math.round(hpB)} л.с.` : null, av: hpA, bv: hpB, better: 'high' },
    { label: 'Разгон 0–100 км/ч', a: accA ? `${n1(accA)} с` : null, b: accB ? `${n1(accB)} с` : null, av: accA, bv: accB, better: 'low' },
    { label: 'Расход', a: consA ? `${fmtCons(consA)} ${consUnit(consA.kind)}` : null, b: consB ? `${fmtCons(consB)} ${consUnit(consB.kind)}` : null, ...(sameConsKind ? { av: consA!.score, bv: consB!.score, better: consBetter } : {}) },
    { label: 'Багажник', a: cargoA ? `${Math.round(cargoA)} л` : null, b: cargoB ? `${Math.round(cargoB)} л` : null, av: cargoA, bv: cargoB, better: 'high' },
    { label: 'Оценка владельцев', a: avgA !== null ? `${n1(avgA)} из 5 (${ruCount(reviewsA.length, 'makePage.reviews')})` : null, b: avgB !== null ? `${n1(avgB)} из 5 (${ruCount(reviewsB.length, 'makePage.reviews')})` : null, av: avgA, bv: avgB, better: 'high' },
    { label: 'Отзывные кампании (США)', a: recallsA.length ? String(recallsA.length) : null, b: recallsB.length ? String(recallsB.length) : null },
  ] as Row[]).filter((r) => r.a !== null || r.b !== null);
  /** Which side leads a row: only when both numbers exist and differ by more than 2%. */
  const lead = (r: Row): 'a' | 'b' | null => {
    if (!r.better || r.av == null || r.bv == null || nearlyEqual(r.av, r.bv)) return null;
    return (r.better === 'high') === (r.av > r.bv) ? 'a' : 'b';
  };
  const barPct = (v: number | null | undefined, o: number | null | undefined) => (v == null ? 0 : Math.max(8, Math.round((v / Math.max(v, o ?? 0)) * 100)));

  // Other Russian comparisons with either car
  const makes = await getAllMakes().catch(() => []);
  const keyA = `${make1}/${model1}`;
  const keyB = `${make2}/${model2}`;
  const related = resolvePairs(makes, RU_COMPARE_PAIRS)
    .filter((p) => p.path !== hePath && [p.a.key, p.b.key].some((k) => k === keyA || k === keyB))
    .slice(0, 6);

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

  const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 'clamp(18px,3vw,26px)' };
  const h2: React.CSSProperties = { fontSize: 'clamp(19px,2vw,23px)', fontWeight: 900, letterSpacing: '-.02em', margin: '0 0 14px' };
  const ownerLine = (v: number | null, n: number) => (v === null ? null : `★ ${n1(v)} · ${ruCount(n, 'makePage.reviews')}`);
  const heads = [
    { name: nameA, mk: mA, md: modA, owner: ownerLine(avgA, reviewsA.length), win: winner === 'a' },
    { name: nameB, mk: mB, md: modB, owner: ownerLine(avgB, reviewsB.length), win: winner === 'b' },
  ];

  return (
    <div style={{ direction: 'ltr', background: 'var(--bg)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <RuStyles />
      <div className="container" style={{ paddingBlock: '28px 64px', display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1000 }}>

      <nav aria-label="Навигация" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <Link href="/ru" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Главная</Link><span>›</span>
        <Link href="/ru#compare" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Сравнение автомобилей</Link><span>›</span>
        <span style={{ color: 'var(--text)' }}>{nameA} или {nameB}</span>
      </nav>

      <div>
        <h1 style={{ fontSize: 'clamp(26px,3.6vw,38px)', fontWeight: 900, letterSpacing: '-.03em', lineHeight: 1.15, margin: 0 }}>{nameA} или {nameB}: что лучше?</h1>
      </div>

      <section className="ru-cmp-head" aria-label="Модели" style={{ ...card, padding: 'clamp(18px,3vw,28px)', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12 }}>
        {heads.map((h, i) => (
          <div key={h.name} style={{ order: i === 0 ? 0 : 2, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8, minWidth: 0 }}>
            <MakeLogo logoUrl={h.mk.logoUrl} nameEn={h.mk.nameEn} size={56} />
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>{h.mk.nameEn}</div>
              <div style={{ fontSize: 'clamp(17px,2vw,21px)', fontWeight: 900 }}>{h.md.nameEn}</div>
            </div>
            {h.owner && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}><span style={{ color: 'var(--star)' }}>{h.owner.slice(0, 1)}</span>{h.owner.slice(1)}</div>}
            {h.win && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--good-ink)', background: 'var(--good-bg)', border: '1px solid var(--good-border)', borderRadius: 999, padding: '3px 10px' }}>🏆 Оценка выше</span>}
          </div>
        ))}
        <div aria-hidden="true" style={{ order: 1, width: 46, height: 46, borderRadius: '50%', background: 'var(--ink)', color: '#fff', fontWeight: 900, fontSize: 14, letterSpacing: '.06em', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>VS</div>
      </section>

      {(verdictLead || shortFacts.length > 0) && (
        <div style={{ ...card, borderLeft: '4px solid var(--accent)' }}>
          <p style={{ margin: 0, fontSize: '1.02rem', lineHeight: 1.7 }}>
            <strong>Коротко: </strong>{[verdictLead, ...shortFacts].filter(Boolean).join(' ')}
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <section aria-labelledby="ru-figures" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg,#0d1b2f,#17408f)', color: '#fff', padding: '14px clamp(16px,3vw,24px)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span aria-hidden="true">⚡</span>
            <h2 id="ru-figures" style={{ fontSize: 17, fontWeight: 800, margin: 0, color: '#fff' }}>Основные цифры</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '14px clamp(16px,3vw,24px) 6px', borderBottom: '1px solid var(--border)' }}>
            {heads.map((h) => (
              <div key={h.name} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <MakeLogo logoUrl={h.mk.logoUrl} nameEn={h.mk.nameEn} size={26} />
                <span style={{ fontWeight: 800, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</span>
              </div>
            ))}
          </div>
          <dl style={{ margin: 0 }}>
            {rows.map((r, idx) => {
              const w = lead(r);
              const bars = r.better && r.av != null && r.bv != null;
              const cell = (val: string | null, mine: number | null | undefined, other: number | null | undefined, isLead: boolean) => (
                <dd style={{ margin: 0, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 15, fontVariantNumeric: 'tabular-nums', color: val ? (isLead ? 'var(--good-ink)' : 'var(--text)') : 'var(--text-faint)' }}>
                    {isLead && <span aria-label="лучше">🏆</span>}
                    <span>{val ?? '—'}</span>
                  </div>
                  {bars && (
                    <div style={{ height: 6, background: 'var(--divider)', borderRadius: 3, marginTop: 7, overflow: 'hidden' }}>
                      <div style={{ height: 6, width: `${barPct(mine, other)}%`, background: isLead ? 'var(--good)' : 'var(--accent-light)', borderRadius: 3 }} />
                    </div>
                  )}
                </dd>
              );
              return (
                <div key={r.label} style={{ padding: '12px clamp(16px,3vw,24px)', borderTop: idx ? '1px solid var(--divider)' : 'none', background: idx % 2 ? 'var(--surface-tint)' : 'transparent' }}>
                  <dt style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>{r.label}</dt>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {cell(r.a, r.av, r.bv, w === 'a')}
                    {cell(r.b, r.bv, r.av, w === 'b')}
                  </div>
                </div>
              );
            })}
          </dl>
          <p style={{ margin: 0, padding: '12px clamp(16px,3vw,24px)', fontSize: 12.5, color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
            Цифры из прайс-листов импортёров и характеристик комплектаций на CarIssues; «—» значит, что данных нет. 🏆 — лучшее значение в строке.
          </p>
        </section>
      )}

      {hasProsCons && (
        <section style={card} aria-labelledby="ru-proscons">
          <h2 id="ru-proscons" style={{ ...h2, margin: '0 0 4px' }}>Плюсы и минусы</h2>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted)' }}>Из обзоров и отзывов владельцев; на английском языке.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,260px), 1fr))', gap: 16 }}>
            {sides.map((s) => (
              <div key={s.name} style={{ minWidth: 0, background: 'var(--surface-tint)', border: '1px solid var(--divider)', borderRadius: 12, padding: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MakeLogo logoUrl={s.mk.logoUrl} nameEn={s.mk.nameEn} size={24} />{s.name}
                </h3>
                {s.pros.length > 0 && (
                  <ul lang="en" style={{ listStyle: 'none', margin: '0 0 10px', padding: 0, display: 'grid', gap: 6, fontSize: 14, lineHeight: 1.5 }}>
                    {s.pros.map((p) => <li key={p} style={{ display: 'flex', gap: 8 }}><span aria-hidden="true" style={{ color: 'var(--good)', fontWeight: 800 }}>✓</span><span>{p}</span></li>)}
                  </ul>
                )}
                {s.cons.length > 0 && (
                  <ul lang="en" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6, fontSize: 14, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
                    {s.cons.map((c) => <li key={c} style={{ display: 'flex', gap: 8 }}><span aria-hidden="true" style={{ color: 'var(--bad)', fontWeight: 800 }}>✗</span><span>{c}</span></li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {faq.length > 0 && (
        <section aria-labelledby="ru-faq">
          <h2 id="ru-faq" style={h2}>Частые вопросы</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {faq.map((f) => (
              <div key={f.q} style={card}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>{f.q}</h3>
                <p style={{ margin: 0, lineHeight: 1.7, color: 'var(--text-muted)', fontSize: 14.5 }}>{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="ru-more">
        <h2 id="ru-more" style={h2}>Подробнее</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%,280px), 1fr))', gap: 10 }}>
          {[
            ...sides.map((s) => ({ href: `/cars/${s.mk.slug}/${s.md.slug}`, label: `${s.name}: отзывы, проблемы и цены`, note: 'на иврите', he: true })),
            { href: hePath, label: 'Это сравнение на иврите', note: 'больше данных и графиков', he: true },
            { href: '/ru/vehicle-lookup', label: 'Проверка авто по номеру', note: 'перед покупкой', he: false },
          ].map((l) => (
            <Link key={l.href} href={l.href} hrefLang={l.he ? 'he' : undefined} className="ru-link-card" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: '13px 16px', textDecoration: 'none', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 700, fontSize: 14.5 }}>{l.label}</span>
                <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-muted)' }}>{l.note}</span>
              </span>
              <span aria-hidden="true" style={{ color: 'var(--accent)', fontWeight: 700 }}>→</span>
            </Link>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <section aria-labelledby="ru-related">
          <h2 id="ru-related" style={h2}>Похожие сравнения</h2>
          <RuVsGrid pairs={related} min={280} />
        </section>
      )}
      </div>
      <style>{`
        @media (max-width: 520px) {
          .ru-cmp-head { gap: 8px !important; }
        }
      `}</style>
    </div>
  );
}
