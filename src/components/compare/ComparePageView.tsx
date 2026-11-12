/**
 * The model-vs-model compare page for all three languages: /cars/compare/... on
 * carissues.co.il (he) and carissues.net (en), and /ru/cars/compare/... (ru, only the pairs
 * in RU_COMPARE_PAIRS). Each route handles metadata, redirects and 404s, then renders this.
 *
 * Russian uses the English data (Latin names; Russian pros/cons where translated, else English, labelled) with Israeli ILS
 * prices. The AI summary, recall list and owner-review highlights have Hebrew/English text
 * only, so they are not rendered on /ru; links to Hebrew-only pages say "(на иврите)".
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMakeBySlug, getModelBySlug, getAllMakes, getSimilarModels } from '@/lib/carsDb';
import { getReviewsForModel } from '@/lib/reviewsDb';
import { getExpertReviews } from '@/lib/expertReviews';
import { findCarModel } from '@/lib/sketchfab';
import { getTrimSpecs } from '@/lib/trimSpecsDb';
import { getRecallsFromCache } from '@/lib/recallsDb';
import { realItems } from '@/lib/faqData';
import type { TrimSpecWithYear } from '@/lib/trimSpecsDb';
import { normEngine } from '@/lib/specSummary';
import { getBaseUrl } from '@/lib/hostLocale';
import { RU_COMPARE_PAIRS } from '@/data/ru-compare-pairs';
import { resolvePairs } from '@/lib/comparePairs';
import { translations } from '@/lib/translations';
import { ru, ruCount, ruPluralIndex } from '@/lib/translations.ru';
import { pick, localHref, type Locale, type Tri } from '@/lib/i18n';
import StarRating from '@/components/StarRating';
import MakeLogo from '@/components/MakeLogo';
import Car3DViewer from '@/components/Car3DViewer';
import PriceHistoryChart from '@/components/PriceHistoryChart';
import CarComparisonAI from '@/components/CarComparisonAI';
import RecallsCompare from '@/components/RecallsCompare';
import ReviewsCompare from '@/components/ReviewsCompare';

function Score({ label, value, best }: { label: string; value: number | null; best: 'a' | 'b' | 'tie' | null }) {
  if (value === null) return <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>-</span>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: '1.75rem', fontWeight: 900, color: best ? 'var(--accent)' : 'var(--text)' }}>
        {value.toFixed(1)}
      </span>
      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{label}</span>
    </div>
  );
}

interface ViewProps { make1: string; model1: string; make2: string; model2: string; locale: Locale }

export default async function ComparePageView({ make1, model1, make2, model2, locale }: ViewProps) {
  const [mA, mB] = await Promise.all([getMakeBySlug(make1), getMakeBySlug(make2)]);
  if (!mA || !mB) notFound();
  const [modA, modB] = await Promise.all([getModelBySlug(make1, model1), getModelBySlug(make2, model2)]);
  if (!modA || !modB) notFound();

  const [reviewsA, reviewsB, expertA, expertB, carModelA, carModelB, similarA, similarB, trimsA, trimsB, recallsA, recallsB] = await Promise.all([
    getReviewsForModel(make1, model1).catch(() => []),
    getReviewsForModel(make2, model2).catch(() => []),
    getExpertReviews(make1, model1).catch(() => []),
    getExpertReviews(make2, model2).catch(() => []),
    findCarModel(make1, model1).catch(() => null),
    findCarModel(make2, model2).catch(() => null),
    getSimilarModels(make1, model1, modA?.category ?? 'sedan', 10).catch(() => []),
    getSimilarModels(make2, model2, modB?.category ?? 'sedan', 10).catch(() => []),
    getTrimSpecs(make1, model1).catch(() => [] as TrimSpecWithYear[]),
    getTrimSpecs(make2, model2).catch(() => [] as TrimSpecWithYear[]),
    getRecallsFromCache(mA.nameEn, modA.nameEn).catch(() => []),
    getRecallsFromCache(mB.nameEn, modB.nameEn).catch(() => []),
  ]);

  // isHe = Hebrew data and RTL; isEn = carissues.net (US prices in USD). Russian uses the
  // English data (Latin names, English pros/cons) with Israeli prices in ILS.
  const isEn = locale === 'en';
  const isHe = locale === 'he';
  const isRu = locale === 'ru';
  const tr = (v: Tri) => pick(locale, v);
  const href = (path: string) => localHref(locale, path);
  /** On the Russian site, marks a link to a page that exists only in Hebrew: "Label (на иврите) →". */
  const heLink = (label: string) => (isRu ? `${label.replace(/\s*→\s*$/, '')} (на иврите) →` : label);
  const sp = locale === 'ru' ? ru.compareStaticPage : translations[locale].compareStaticPage;
  const nameA = isHe ? `${mA.nameHe} ${modA.nameHe}` : `${mA.nameEn} ${modA.nameEn}`;
  const nameB = isHe ? `${mB.nameHe} ${modB.nameHe}` : `${mB.nameEn} ${modB.nameEn}`;

  const avgA = reviewsA.length ? reviewsA.reduce((s, r) => s + r.rating, 0) / reviewsA.length : null;
  const avgB = reviewsB.length ? reviewsB.reduce((s, r) => s + r.rating, 0) / reviewsB.length : null;
  const scoreA = expertA[0]?.topScore ?? null;
  const scoreB = expertB[0]?.topScore ?? null;

  const better = (a: number | null, b: number | null): 'a' | 'b' | 'tie' | null => {
    if (a === null && b === null) return null;
    if (a === null) return 'b';
    if (b === null) return 'a';
    if (Math.abs(a - b) < 0.15) return 'tie';
    return a > b ? 'a' : 'b';
  };

  const ratingWinner = better(avgA, avgB);
  const scoreWinner = better(scoreA, scoreB);
  const hasHeb = (s: string) => /[\u0590-\u05FF]/.test(s);
  const cleanPros = (items: string[]) => items.filter(p => !/ציין שהדור החדש קטן מבפנים מקודמו/.test(p));
  const cleanCons = (items: string[]) => items.filter(p => !/ציין שהדור החדש קטן מבפנים מקודמו/.test(p));
  // Russian: the translated lists (pros_ru/cons_ru) when a model has them, else the English ones
  const ruOr = (ru: string[] | undefined, en: string[] | undefined) =>
    (isRu && ru && ru.length > 0 ? ru : (en ?? []).filter(x => x && !hasHeb(x)));
  const ruUsed = (ru: string[] | undefined, en: string[] | undefined) => !!(ru && ru.length > 0) || !(en && en.length > 0);
  const prosA = !isHe
    ? ruOr(expertA[0]?.prosRu, expertA[0]?.prosEn)
    : cleanPros(expertA[0]?.pros ?? []).map(p => p.replace(/[—–]/g, '-'));
  const consA = !isHe
    ? ruOr(expertA[0]?.consRu, expertA[0]?.consEn)
    : cleanCons(expertA[0]?.cons ?? []).map(p => p.replace(/[—–]/g, '-'));
  const prosB = !isHe
    ? ruOr(expertB[0]?.prosRu, expertB[0]?.prosEn)
    : cleanPros(expertB[0]?.pros ?? []).map(p => p.replace(/[—–]/g, '-'));
  const consB = !isHe
    ? ruOr(expertB[0]?.consRu, expertB[0]?.consEn)
    : cleanCons(expertB[0]?.cons ?? []).map(p => p.replace(/[—–]/g, '-'));
  // Whether any list on the Russian page is still the English fallback (then it is labelled)
  const ruHasEnglish = isRu && !(
    ruUsed(expertA[0]?.prosRu, expertA[0]?.prosEn) && ruUsed(expertA[0]?.consRu, expertA[0]?.consEn)
    && ruUsed(expertB[0]?.prosRu, expertB[0]?.prosEn) && ruUsed(expertB[0]?.consRu, expertB[0]?.consEn));

  // ── Performance data aggregation ─────────────────────────────────────────────
  const maxVal = (trims: TrimSpecWithYear[], key: keyof TrimSpecWithYear): number | null =>
    trims.reduce((best: number | null, t) => {
      const v = t[key] as number | undefined;
      if (v == null) return best;
      return best === null || v > best ? v : best;
    }, null);
  const minVal = (trims: TrimSpecWithYear[], key: keyof TrimSpecWithYear): number | null =>
    trims.reduce((best: number | null, t) => {
      const v = t[key] as number | undefined;
      if (v == null) return best;
      return best === null || v < best ? v : best;
    }, null);

  // Match the model page: exclude PHEV's electric-range WLTP figure from km/L and
  // show every plausible combustion/electric figure in that model's own units.
  const getConsumption = (trims: TrimSpecWithYear[]) => {
    const electric = trims.filter(t => normEngine(t.engineType) === 'electric' && typeof t.fuelConsumption === 'number' && t.fuelConsumption > 0 && t.fuelConsumption <= 50);
    const combustion = trims.filter(t => {
      const engine = normEngine(t.engineType);
      return (engine === 'petrol' || engine === 'hybrid' || engine === 'diesel') && typeof t.fuelConsumption === 'number' && t.fuelConsumption >= 3 && t.fuelConsumption <= 20;
    });
    if (combustion.length) {
      const values = combustion.map(t => 100 / t.fuelConsumption!);
      return { kind: 'fuel' as const, score: values.reduce((sum, value) => sum + value, 0) / values.length, min: Math.min(...values), max: Math.max(...values) };
    }
    if (electric.length) {
      const values = electric.map(t => t.fuelConsumption!);
      return { kind: 'electric' as const, score: values.reduce((sum, value) => sum + value, 0) / values.length, min: Math.min(...values), max: Math.max(...values) };
    }
    return null;
  };
  const consumptionA = getConsumption(trimsA);
  const consumptionB = getConsumption(trimsB);
  const fuelComparable = consumptionA !== null && consumptionB !== null && consumptionA.kind === consumptionB.kind;
  const fuelLowerBetter = consumptionA?.kind === 'electric' && consumptionB?.kind === 'electric';
  const formatConsumption = (value: NonNullable<typeof consumptionA>) => dec(value.min === value.max
    ? value.min.toFixed(1)
    : `${value.min.toFixed(1)}-${value.max.toFixed(1)}`);

  const perfA = {
    hp:       maxVal(trimsA, 'engineHp'),
    torque:   maxVal(trimsA, 'torqueNm'),
    accel:    minVal(trimsA, 'acceleration'),
    topSpeed: maxVal(trimsA, 'topSpeedKmh'),
    fuel:     consumptionA?.score ?? null,
    cargo:    maxVal(trimsA, 'cargoLiters'),
    weight:   minVal(trimsA, 'curbWeightKg'),
    price:    minVal(trimsA, 'priceIls'),
  };
  const perfB = {
    hp:       maxVal(trimsB, 'engineHp'),
    torque:   maxVal(trimsB, 'torqueNm'),
    accel:    minVal(trimsB, 'acceleration'),
    topSpeed: maxVal(trimsB, 'topSpeedKmh'),
    fuel:     consumptionB?.score ?? null,
    cargo:    maxVal(trimsB, 'cargoLiters'),
    weight:   minVal(trimsB, 'curbWeightKg'),
    price:    minVal(trimsB, 'priceIls'),
  };

  type PerfKey = keyof typeof perfA;
  type PerfStat = {
    key: PerfKey;
    label: string;
    unit: string;
    note: string;
    lowerBetter: boolean;
    format: (v: number) => string;
  };

  // Detect if either side is fully electric
  const isElectricA = consumptionA?.kind === 'electric';
  const isElectricB = consumptionB?.kind === 'electric';
  const anyElectric = isElectricA || isElectricB;

  // For electric models, use raw L/100km value (which is actually kWh/100km).
  // For fuel models, convert L/100km → km/L. Keep separate logic.
  const fuelLabel = anyElectric
    ? tr({ he: 'צריכה', en: 'Energy / Fuel', ru: 'Расход' })
    : tr({ he: 'צריכת דלק', en: 'Fuel Economy', ru: 'Расход топлива' });
  const fuelUnit = (v: number, isElec: boolean) => {
    if (isElec) return tr({ he: 'קוט"ש/100ק"מ', en: 'kWh/100km', ru: 'кВт·ч/100 км' });
    return tr({ he: 'ק"מ/ל', en: 'km/L', ru: 'км/л' });
  };
  const noDataLabel = tr({ he: 'אין נתון', en: 'N/A', ru: 'нет данных' });
  const lowerBetter = tr({ he: 'נמוך = טוב יותר', en: 'lower = better', ru: 'меньше = лучше' });
  const higherBetter = tr({ he: 'גבוה = טוב יותר', en: 'higher = better', ru: 'больше = лучше' });

  const allPerfStats: PerfStat[] = [
    { key: 'price',    label: tr({ he: 'מחיר התחלתי', en: 'Starting Price', ru: 'Цена от' }),  unit: '', note: lowerBetter, lowerBetter: true,  format: (v: number) => v > 0 ? (isEn ? `$${Math.round(v / 3700)}K` : `₪${Math.round(v / 1000).toLocaleString()}K`) : noDataLabel },
    { key: 'hp',       label: tr({ he: 'הספק', en: 'Horsepower', ru: 'Мощность' }),            unit: tr({ he: 'כ"ס', en: 'hp', ru: 'л.с.' }), note: higherBetter, lowerBetter: false, format: (v: number) => Math.round(v).toString() },
    { key: 'torque',   label: tr({ he: 'מומנט', en: 'Torque', ru: 'Крутящий момент' }),        unit: tr({ he: 'ניוטון-מטר', en: 'Nm', ru: 'Н·м' }), note: higherBetter, lowerBetter: false, format: (v: number) => Math.round(v).toString() },
    { key: 'accel',    label: tr({ he: '0-100 קמ"ש', en: '0-100 km/h', ru: '0–100 км/ч' }),    unit: tr({ he: 'שנ\'', en: 'sec', ru: 'с' }), note: lowerBetter, lowerBetter: true,  format: (v: number) => v.toFixed(1) },
    { key: 'topSpeed', label: tr({ he: "מהירות מקס'", en: 'Top Speed', ru: 'Макс. скорость' }), unit: tr({ he: 'קמ"ש', en: 'km/h', ru: 'км/ч' }), note: higherBetter, lowerBetter: false, format: (v: number) => Math.round(v).toString() },
    { key: 'fuel',     label: fuelLabel, unit: '', note: fuelComparable ? (fuelLowerBetter ? lowerBetter : higherBetter) : tr({ he: 'יחידות שונות, אין השוואה ישירה', en: 'Different units; not directly comparable', ru: 'Разные единицы, прямое сравнение невозможно' }), lowerBetter: fuelLowerBetter, format: (v: number) => v.toFixed(1) /* overridden in render */ },
    { key: 'cargo',    label: tr({ he: 'תא מטען', en: 'Cargo Space', ru: 'Багажник' }),        unit: tr({ he: "ל'", en: 'L', ru: 'л' }), note: higherBetter, lowerBetter: false, format: (v: number) => Math.round(v).toString() },
    { key: 'weight',   label: tr({ he: 'משקל', en: 'Curb Weight', ru: 'Снаряжённая масса' }),  unit: tr({ he: 'ק"ג', en: 'kg', ru: 'кг' }), note: lowerBetter, lowerBetter: true,  format: (v: number) => Math.round(v).toString() },
  ];
  // Show rows even if only one side has data (show "אין נתון" for the other)
  const perfStats = allPerfStats.filter(s => perfA[s.key] != null || perfB[s.key] != null);

  const hasPerf = perfStats.length > 0;

  const priceCars = [
    { makeSlug: make1, modelSlug: model1, makeEn: mA.nameEn, modelEn: modA.nameEn, name: nameA, color: '#3b82f6' },
    { makeSlug: make2, modelSlug: model2, makeEn: mB.nameEn, modelEn: modB.nameEn, name: nameB, color: '#f97316' },
  ];
  // In RTL (Hebrew) the rest of the page shows carA on the right, carB on the left.
  // Swap performance columns to match so trophy always appears on the visually correct side.
  const swapCols = isHe;

  const col: React.CSSProperties = { flex: 1, minWidth: 0, textAlign: 'center' };
  const divider: React.CSSProperties = { width: 1, background: 'var(--border)', alignSelf: 'stretch', flexShrink: 0 };

  // ── Verdict (shared by the short summary under the H1 and the full section below) ──
  const hasVerdict = scoreA !== null || scoreB !== null || avgA !== null || avgB !== null;
  const verdictWinner = better(scoreA, scoreB) ?? better(avgA, avgB);
  const winnerName = verdictWinner === 'a' ? nameA : verdictWinner === 'b' ? nameB : null;
  const loserName  = verdictWinner === 'a' ? nameB : verdictWinner === 'b' ? nameA : null;
  const hasOwnerReviews = reviewsA.length > 0 || reviewsB.length > 0;
  const verdictBasis = hasOwnerReviews
    ? sp.verdictWinnerPre
    : tr({ he: 'על בסיס מבחנים ונתונים רשמיים,', en: 'Based on tests and official data,', ru: 'По тестам и официальным данным' });

  // ── Facts used by the short verdict and the FAQ (only real data, never guessed) ──
  const ils = (v: number) => `₪${Math.round(v).toLocaleString(isRu ? 'ru-RU' : 'en-US')}`;
  /** Russian decimal comma (15,2); he/en keep the dot. */
  const dec = (s: string) => (isRu ? s.replace(/(\d)\.(\d)/g, '$1,$2') : s);
  const nearlyEqual = (a: number, b: number) => Math.abs(a - b) / Math.max(a, b) < 0.02;
  const priceA = perfA.price != null && perfA.price > 0 ? perfA.price : null;
  const priceB = perfB.price != null && perfB.price > 0 ? perfB.price : null;
  const cargoA = perfA.cargo != null && perfA.cargo > 0 ? perfA.cargo : null;
  const cargoB = perfB.cargo != null && perfB.cargo > 0 ? perfB.cargo : null;
  const fuelUnitText = (kind: 'fuel' | 'electric') => kind === 'electric'
    ? tr({ he: 'קוט"ש ל-100 ק"מ', en: 'kWh/100km', ru: 'кВт·ч/100 км' })
    : tr({ he: 'ק"מ לליטר', en: 'km/L', ru: 'км/л' });

  type Fact = { sentence: string; faq: { q: string; a: string } };

  const priceFact: Fact | null = priceA !== null && priceB !== null ? (() => {
    const q = tr({ he: `מה זול יותר, ${nameA} או ${nameB}?`, en: `Which is cheaper, the ${nameA} or the ${nameB}?`, ru: `Что дешевле: ${nameA} или ${nameB}?` });
    if (nearlyEqual(priceA, priceB)) {
      const a = tr({
        he: `שני הדגמים מתחילים במחיר דומה: ${ils(priceA)} ל${nameA} ו-${ils(priceB)} ל${nameB} (מחיר מחירון התחלתי בישראל).`,
        en: `Both start at a similar price: ${ils(priceA)} for the ${nameA} and ${ils(priceB)} for the ${nameB} (starting list price in Israel).`,
        ru: `Цены почти одинаковые: ${nameA} — от ${ils(priceA)}, ${nameB} — от ${ils(priceB)} (начальная цена по израильскому прайс-листу).`,
      });
      return { sentence: a, faq: { q, a } };
    }
    const cheapA = priceA < priceB;
    const [cn, cp, en, ep] = cheapA ? [nameA, priceA, nameB, priceB] : [nameB, priceB, nameA, priceA];
    const diff = ils(ep - cp);
    const a = tr({
      he: `${cn} זול יותר: מחירו מתחיל ב-${ils(cp)}, לעומת ${ils(ep)} ל${en} - הפרש של ${diff} (מחיר מחירון התחלתי בישראל).`,
      en: `The ${cn} is cheaper, starting at ${ils(cp)} compared with ${ils(ep)} for the ${en} - a difference of ${diff} (starting list price in Israel).`,
      ru: `${cn} дешевле: от ${ils(cp)}, у ${en} — от ${ils(ep)}. Разница — ${diff} (начальная цена по израильскому прайс-листу).`,
    });
    const sentence = tr({
      he: `${cn} זול יותר, החל מ-${ils(cp)} לעומת ${ils(ep)}.`,
      en: `The ${cn} is cheaper, starting at ${ils(cp)} vs ${ils(ep)}.`,
      ru: `${cn} дешевле: от ${ils(cp)} против ${ils(ep)}.`,
    });
    return { sentence, faq: { q, a } };
  })() : null;

  const fuelFact: Fact | null = fuelComparable && consumptionA && consumptionB ? (() => {
    const kind = consumptionA.kind;
    const unit = fuelUnitText(kind);
    const q = kind === 'electric'
      ? tr({ he: `מי צורך פחות חשמל, ${nameA} או ${nameB}?`, en: `Which uses less energy, the ${nameA} or the ${nameB}?`, ru: `Кто расходует меньше электроэнергии: ${nameA} или ${nameB}?` })
      : tr({ he: `מי חסכוני יותר בדלק, ${nameA} או ${nameB}?`, en: `Which is more fuel efficient, the ${nameA} or the ${nameB}?`, ru: `Кто экономичнее: ${nameA} или ${nameB}?` });
    const figures = tr({
      he: `${formatConsumption(consumptionA)} ${unit} ל${nameA} לעומת ${formatConsumption(consumptionB)} ${unit} ל${nameB}`,
      en: `${formatConsumption(consumptionA)} ${unit} for the ${nameA} vs ${formatConsumption(consumptionB)} ${unit} for the ${nameB}`,
      ru: `${formatConsumption(consumptionA)} ${unit} у ${nameA} против ${formatConsumption(consumptionB)} ${unit} у ${nameB}`,
    });
    if (nearlyEqual(consumptionA.score, consumptionB.score)) {
      const a = tr({ he: `הצריכה של שניהם כמעט זהה: ${figures}.`, en: `They are about equally efficient: ${figures}.`, ru: `Расход почти одинаковый: ${figures}.` });
      return { sentence: a, faq: { q, a } };
    }
    // fuel: km/L, higher is better · electric: kWh/100km, lower is better
    const aWins = kind === 'electric' ? consumptionA.score < consumptionB.score : consumptionA.score > consumptionB.score;
    const wn = aWins ? nameA : nameB;
    const a = kind === 'electric'
      ? tr({ he: `${wn} צורך פחות חשמל: ${figures}.`, en: `The ${wn} uses less energy: ${figures}.`, ru: `${wn} расходует меньше электроэнергии: ${figures}.` })
      : tr({ he: `${wn} חסכוני יותר בדלק: ${figures}.`, en: `The ${wn} is more fuel efficient: ${figures}.`, ru: `${wn} экономичнее: ${figures}.` });
    return { sentence: a, faq: { q, a } };
  })() : null;

  const spaceFact: Fact | null = cargoA !== null && cargoB !== null ? (() => {
    const q = tr({ he: `מי מרווח יותר, ${nameA} או ${nameB}?`, en: `Which is roomier, the ${nameA} or the ${nameB}?`, ru: `Кто просторнее: ${nameA} или ${nameB}?` });
    const l = (v: number) => tr({ he: `${Math.round(v)} ליטר`, en: `${Math.round(v)} L`, ru: `${Math.round(v)} л` });
    if (nearlyEqual(cargoA, cargoB)) {
      const a = tr({
        he: `תא המטען כמעט זהה בגודלו: ${l(cargoA)} ב${nameA} ו-${l(cargoB)} ב${nameB}.`,
        en: `Their trunks are about the same size: ${l(cargoA)} in the ${nameA} and ${l(cargoB)} in the ${nameB}.`,
        ru: `Багажники почти одинаковые: ${l(cargoA)} у ${nameA} и ${l(cargoB)} у ${nameB}.`,
      });
      return { sentence: a, faq: { q, a } };
    }
    const aWins = cargoA > cargoB;
    const [wn, wv, ln, lv] = aWins ? [nameA, cargoA, nameB, cargoB] : [nameB, cargoB, nameA, cargoA];
    const a = tr({
      he: `לפי נפח תא המטען, ${wn} מרווח יותר: ${l(wv)} לעומת ${l(lv)} ב${ln}.`,
      en: `By trunk volume, the ${wn} is roomier: ${l(wv)} compared with ${l(lv)} in the ${ln}.`,
      ru: `По объёму багажника ${wn} просторнее: ${l(wv)} против ${l(lv)} у ${ln}.`,
    });
    const sentence = tr({
      he: `ל${wn} תא מטען גדול יותר (${l(wv)} לעומת ${l(lv)}).`,
      en: `The ${wn} has the bigger trunk (${l(wv)} vs ${l(lv)}).`,
      ru: `У ${wn} багажник больше (${l(wv)} против ${l(lv)}).`,
    });
    return { sentence, faq: { q, a } };
  })() : null;

  // Common problems: only real cons (placeholder "no data found" strings dropped). Recall
  // counts are added as supporting detail only when both models have NHTSA records (a zero
  // may just mean the model isn't sold in the US). No real cons on either side -> no question.
  const problemsFaq: { q: string; a: string } | null = isRu ? null : (() => {
    const realConsA = realItems(consA);
    const realConsB = realItems(consB);
    if (realConsA.length === 0 && realConsB.length === 0) return null;
    const top = (items: string[]) => items.slice(0, 2).map(c => c.replace(/[.\s]+$/, '')).join('; ');
    const parts: string[] = [];
    if (realConsA.length > 0) parts.push(isEn ? `Common complaints about the ${nameA}: ${top(realConsA)}.` : `תלונות נפוצות על ${nameA}: ${top(realConsA)}.`);
    if (realConsB.length > 0) parts.push(isEn ? `Common complaints about the ${nameB}: ${top(realConsB)}.` : `תלונות נפוצות על ${nameB}: ${top(realConsB)}.`);
    if (recallsA.length > 0 && recallsB.length > 0) {
      parts.push(isEn
        ? `The US recall database (NHTSA) lists ${recallsA.length} recalls for the ${nameA} and ${recallsB.length} for the ${nameB}.`
        : `במאגר הריקולים האמריקאי (NHTSA) רשומים ${recallsA.length} ריקולים ל${nameA} ו-${recallsB.length} ל${nameB}.`);
    }
    return {
      q: isEn ? `What are the common problems with the ${nameA} and the ${nameB}?` : `מה הבעיות הנפוצות של ${nameA} ושל ${nameB}?`,
      a: parts.join(' '),
    };
  })();

  // Russian: the cons exist only in Hebrew/English, so the problems question is replaced by
  // the recall counts (both models need NHTSA records; a zero may mean "not sold in the US").
  const recallFaqRu = isRu && recallsA.length > 0 && recallsB.length > 0 ? {
    q: `Сколько отзывных кампаний было у ${nameA} и ${nameB}?`,
    a: `В американской базе отзывных кампаний (NHTSA) у ${nameA} ${recallsA.length} ${['кампания', 'кампании', 'кампаний'][ruPluralIndex(recallsA.length)]}, у ${nameB} — ${recallsB.length}. Кампания в США не всегда относится к автомобилям, проданным в Израиле.`,
  } : null;
  const faqItems = [priceFact?.faq, problemsFaq, fuelFact?.faq, spaceFact?.faq, recallFaqRu]
    .filter((f): f is { q: string; a: string } => !!f);

  // Short verdict under the H1: the verdict line + up to two concrete differences
  const shortVerdictLead = !hasVerdict ? null
    : verdictWinner && verdictWinner !== 'tie' ? 'winner'
    : tr({ he: 'שני הדגמים מקבלים ציון כולל דומה מאוד.', en: 'Both models score very similarly overall.', ru: 'Обе модели получают очень близкие общие оценки.' });
  const shortVerdictFacts = [priceFact, fuelFact, spaceFact].filter((f): f is Fact => !!f).slice(0, 2).map(f => f.sentence);
  const showShortVerdict = shortVerdictLead !== null || shortVerdictFacts.length >= 2;

  // Related comparisons per car. Russian: only pairs that have a Russian page (/ru URLs).
  type Rel = { key: string; href: string; name: string };
  const ruPairs = isRu ? resolvePairs(await getAllMakes().catch(() => []), RU_COMPARE_PAIRS) : [];
  const relFor = (selfMake: string, selfModel: string, otherMake: string, otherModel: string, similar: typeof similarA): Rel[] => {
    const self = `${selfMake}/${selfModel}`;
    if (isRu) {
      return ruPairs
        .filter((p) => (p.a.key === self || p.b.key === self) && ![p.a.key, p.b.key].includes(`${otherMake}/${otherModel}`))
        .slice(0, 6)
        .map((p) => { const o = p.a.key === self ? p.b : p.a; return { key: o.key, href: `/ru${p.path}`, name: `${o.make.nameEn} ${o.model.nameEn}` }; });
    }
    return similar.filter(s => !(s.makeSlug === otherMake && s.model.slug === otherModel)).slice(0, 6).map(s => {
      const [s1, s2] = [self, `${s.makeSlug}/${s.model.slug}`].sort();
      return { key: `${s.makeSlug}/${s.model.slug}`, href: `/cars/compare/${s1}/${s2}`, name: isEn ? `${s.makeNameEn} ${s.model.nameEn}` : `${s.makeNameHe} ${s.model.nameHe}` };
    });
  };
  const relA = relFor(make1, model1, make2, model2, similarA);
  const relB = relFor(make2, model2, make1, model1, similarB);

  return (
    <div style={{ padding: '48px 0 80px', direction: isHe ? 'rtl' : 'ltr' }}>
      <style>{`
        @media (max-width: 540px) {
          .cmp-scores-mid    { display: none !important; }
          .cmp-score-vdivider { display: none !important; }
          .cmp-score-col     { padding: 8px 6px !important; }
          .cmp-related-grid  { grid-template-columns: 1fr !important; gap: 12px !important; }
          .cmp-car-name      { font-size: 0.9rem !important; word-break: break-word; }
          .cmp-header-card   { flex-wrap: wrap !important; }
          .cmp-proscons-flex { flex-direction: column !important; }
          .cmp-proscons-vdiv { display: none !important; }
          .perf-grid-row     { grid-template-columns: 80px 1fr 1fr !important; gap: 6px !important; padding: 10px 12px !important; }
          .perf-grid-header  { grid-template-columns: 80px 1fr 1fr !important; gap: 6px !important; padding: 10px 12px !important; }
          .perf-value        { font-size: 1rem !important; }
          .perf-stat-label   { font-size: 0.68rem !important; }
        }
      `}</style>
      <div className="container">

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 24, flexWrap: 'wrap' }}>
          <Link href={href('/')} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{sp.breadcrumbHome}</Link>
          <span>›</span>
          <Link href={isRu ? '/ru#compare' : '/cars/compare'} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{sp.breadcrumbCompare}</Link>
          <span>›</span>
          <span style={{ color: 'var(--text)' }}>{nameA} {sp.vsWord} {nameB}</span>
        </div>

        <h1 style={{ fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: 900, marginBottom: 8 }}>
          {nameA} {sp.vsWord} {nameB}{isRu ? ': что лучше?' : ''}
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>
          {isRu ? sp.subtitleCompare : `${mA.nameEn} ${modA.nameEn} vs ${mB.nameEn} ${modB.nameEn} - ${sp.subtitleCompare}`}
        </p>

        {/* Short verdict (full verdict section stays further down) */}
        {showShortVerdict && (
          <div className="card" style={{ padding: '16px 20px', marginTop: -16, marginBottom: 28, borderInlineStart: '4px solid var(--accent)' }}>
            <p style={{ margin: 0, fontSize: '0.9375rem', lineHeight: 1.7, color: 'var(--text)' }}>
              <strong style={{ marginInlineEnd: 6 }}>{tr({ he: 'בשורה התחתונה:', en: 'Quick verdict:', ru: 'Коротко:' })}</strong>
              {shortVerdictLead === 'winner'
                ? <>{verdictBasis} <strong>{winnerName}</strong> {sp.verdictWinnerMid} {loserName}.</>
                : shortVerdictLead}
              {shortVerdictFacts.map((f, i) => <span key={i}> {f}</span>)}
            </p>
          </div>
        )}

        {/* Header card */}
        <div className="card cmp-header-card" style={{ padding: '24px 28px', marginBottom: 28, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ ...col }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <MakeLogo logoUrl={mA.logoUrl} nameEn={mA.nameEn} size={52} />
            </div>
            <div className="cmp-car-name" style={{ fontWeight: 900, fontSize: '1.15rem', textAlign: 'center' }}>{nameA}</div>
            {isHe && <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>{mA.nameEn} {modA.nameEn}</div>}
            <Link href={`/cars/${make1}/${model1}`} style={{ fontSize: '0.8125rem', color: 'var(--accent)', textDecoration: 'none', display: 'block', marginTop: 8 }}>
              {heLink(sp.modelPageLink)}
            </Link>
            <Link href={`/cars/${make1}/${model1}/issues`} style={{ fontSize: '0.8125rem', color: 'var(--accent)', textDecoration: 'none', display: 'block', marginTop: 4 }}>
              {heLink(sp.issuesLink)}
            </Link>
          </div>
          <div style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--text-muted)', flexShrink: 0 }}>VS</div>
          <div style={{ ...col }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <MakeLogo logoUrl={mB.logoUrl} nameEn={mB.nameEn} size={52} />
            </div>
            <div className="cmp-car-name" style={{ fontWeight: 900, fontSize: '1.15rem', textAlign: 'center' }}>{nameB}</div>
            {isHe && <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>{mB.nameEn} {modB.nameEn}</div>}
            <Link href={`/cars/${make2}/${model2}`} style={{ fontSize: '0.8125rem', color: 'var(--accent)', textDecoration: 'none', display: 'block', marginTop: 8 }}>
              {heLink(sp.modelPageLink)}
            </Link>
            <Link href={`/cars/${make2}/${model2}/issues`} style={{ fontSize: '0.8125rem', color: 'var(--accent)', textDecoration: 'none', display: 'block', marginTop: 4 }}>
              {heLink(sp.issuesLink)}
            </Link>
          </div>
        </div>

        {/* 3D Viewers */}
        {(carModelA || carModelB) && (
          <div className="card" style={{ padding: '20px', marginBottom: 28 }}>
            <h2 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 16 }}>{sp.models3dTitle}</h2>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 260, height: 280 }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 8, textAlign: 'center', color: 'var(--text)' }}>{nameA}</div>
                <div style={{ height: 'calc(100% - 28px)', borderRadius: 12, overflow: 'hidden' }}>
                  {carModelA
                    ? <Car3DViewer uid={carModelA.uid} modelName={nameA} makeSlug={make1} modelSlug={model1} />
                    : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-muted)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{sp.no3dModel}</div>
                  }
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 260, height: 280 }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 8, textAlign: 'center', color: 'var(--text)' }}>{nameB}</div>
                <div style={{ height: 'calc(100% - 28px)', borderRadius: 12, overflow: 'hidden' }}>
                  {carModelB
                    ? <Car3DViewer uid={carModelB.uid} modelName={nameB} makeSlug={make2} modelSlug={model2} />
                    : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-muted)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{sp.no3dModel}</div>
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scores */}
        <div className="card" style={{ padding: '24px 28px', marginBottom: 28 }}>
          <h2 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 20 }}>{sp.scoresTitle}</h2>
          <div style={{ display: 'flex', gap: 0 }}>
            <div className="cmp-score-col" style={{ ...col, padding: '0 16px' }}>
              <Score label={sp.userRating} value={avgA} best={ratingWinner === 'a' ? 'a' : null} />
              {avgA !== null && <div style={{ marginTop: 6, display: 'flex', justifyContent: 'center' }}><StarRating rating={avgA} size={14} /></div>}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{isRu ? ruCount(reviewsA.length, 'makePage.reviews') : `${reviewsA.length} ${sp.reviews}`}</div>
            </div>
            <div className="cmp-score-vdivider" style={divider} />
            <div className="cmp-scores-mid" style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 20px', gap: 4 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{sp.userRating}</div>
            </div>
            <div className="cmp-score-vdivider" style={divider} />
            <div className="cmp-score-col" style={{ ...col, padding: '0 16px' }}>
              <Score label={sp.userRating} value={avgB} best={ratingWinner === 'b' ? 'b' : null} />
              {avgB !== null && <div style={{ marginTop: 6, display: 'flex', justifyContent: 'center' }}><StarRating rating={avgB} size={14} /></div>}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{isRu ? ruCount(reviewsB.length, 'makePage.reviews') : `${reviewsB.length} ${sp.reviews}`}</div>
            </div>
          </div>

          {(scoreA !== null || scoreB !== null) && (
            <>
              <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />
              <div style={{ display: 'flex', gap: 0 }}>
                <div className="cmp-score-col" style={{ ...col, padding: '0 16px' }}>
                  <Score label={sp.aiScore} value={scoreA} best={scoreWinner === 'a' ? 'a' : null} />
                </div>
                <div className="cmp-score-vdivider" style={divider} />
                <div className="cmp-scores-mid" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{sp.aiScore}</div>
                </div>
                <div className="cmp-score-vdivider" style={divider} />
                <div className="cmp-score-col" style={{ ...col, padding: '0 16px' }}>
                  <Score label={sp.aiScore} value={scoreB} best={scoreWinner === 'b' ? 'b' : null} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Performance Section */}
        {hasPerf && (() => {
          return (
            <>
              <style>{`
                @keyframes perfBarGrow {
                  from { transform: scaleX(0); }
                  to   { transform: scaleX(1); }
                }
                .perf-bar-fill {
                  animation: perfBarGrow 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
                  transform-origin: left center;
                }
                @media (max-width: 520px) {
                  .perf-grid-row { grid-template-columns: 90px 1fr 1fr !important; gap: 8px !important; padding: 12px 14px !important; }
                  .perf-grid-header { grid-template-columns: 90px 1fr 1fr !important; gap: 8px !important; padding: 12px 14px !important; }
                  .perf-value { font-size: 1.1rem !important; }
                  .perf-stat-label { font-size: 0.7rem !important; }
                }
              `}</style>
              <div className="card" style={{ overflow: 'hidden', marginBottom: 28 }} dir="ltr">

                {/* Dark header */}
                <div style={{
                  padding: '16px 24px',
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: '1.2rem' }}>⚡</span>
                  <h2 style={{ margin: 0, color: '#f1f5f9', fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.01em' }}>
                    {sp.performanceTitle}
                  </h2>
                </div>

                {/* Column headers */}
                <div className="perf-grid-header" style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr 1fr',
                  gap: 12,
                  padding: '14px 24px',
                  borderBottom: '2px solid var(--border)',
                  alignItems: 'center',
                }}>
                  <div />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <MakeLogo logoUrl={swapCols ? mB.logoUrl : mA.logoUrl} nameEn={swapCols ? mB.nameEn : mA.nameEn} size={28} />
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', marginTop: 4, color: 'var(--text)', textAlign: 'center' }}>{swapCols ? nameB : nameA}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <MakeLogo logoUrl={swapCols ? mA.logoUrl : mB.logoUrl} nameEn={swapCols ? mA.nameEn : mB.nameEn} size={28} />
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', marginTop: 4, color: 'var(--text)', textAlign: 'center' }}>{swapCols ? nameA : nameB}</div>
                  </div>
                </div>

                {/* Stat rows */}
                {perfStats.map((stat, idx) => {
                  const vA = perfA[stat.key];
                  const vB = perfB[stat.key];
                  // Don't award trophy if either side has no data
                  const comparable = stat.key !== 'fuel' || fuelComparable;
                  const winA = comparable && vA != null && vB != null && (stat.lowerBetter ? vA < vB : vA > vB);
                  const winB = comparable && vA != null && vB != null && (stat.lowerBetter ? vB < vA : vB > vA);
                  const tie  = comparable && vA != null && vB != null && vA === vB;

                  // Compute bar widths so the "better" value = 100%, worse = proportional
                  const barPct = (v: number | null, other: number | null): number => {
                    if (v == null || !comparable) return 0;
                    if (other == null) return 100;
                    if (v === other) return 100;
                    if (stat.lowerBetter) {
                      const mn = Math.min(v, other);
                      return (mn / v) * 100;
                    } else {
                      const mx = Math.max(v, other);
                      return (v / mx) * 100;
                    }
                  };
                  const pA = barPct(vA, vB);
                  const pB = barPct(vB, vA);

                  // In RTL mode columns are swapped so carA appears on the right
                  const vLeft  = swapCols ? vB  : vA;
                  const vRight = swapCols ? vA  : vB;
                  const winLeft  = swapCols ? winB : winA;
                  const winRight = swapCols ? winA : winB;
                  const pLeft  = swapCols ? pB  : pA;
                  const pRight = swapCols ? pA  : pB;

                  const winColor = 'var(--accent)';
                  const neutralColor = '#cbd5e1';
                  const tieColor = '#94a3b8';

                  const rowBg = idx % 2 === 1 ? 'var(--bg-muted)' : 'transparent';

                  return (
                    <div key={stat.key} className="perf-grid-row" style={{
                      display: 'grid',
                      gridTemplateColumns: '140px 1fr 1fr',
                      gap: 12,
                      padding: '14px 24px',
                      borderBottom: idx < perfStats.length - 1 ? '1px solid var(--border)' : 'none',
                      background: rowBg,
                      alignItems: 'center',
                    }}>
                      {/* Stat label */}
                      <div>
                        <div className="perf-stat-label" style={{
                          fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)',
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                        }}>
                          {stat.label}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {stat.note}
                        </div>
                      </div>

                      {/* Left column value */}
                      {(() => {
                        const isLeftA = !swapCols;
                        const isElecLeft = isLeftA ? isElectricA : isElectricB;
                        const consumption = isLeftA ? consumptionA : consumptionB;
                        const displayVal = stat.key === 'fuel' && consumption
                          ? formatConsumption(consumption) : (vLeft != null ? stat.format(vLeft) : null);
                        const displayUnit = stat.key === 'fuel' && vLeft != null
                          ? fuelUnit(vLeft, isElecLeft) : stat.unit;
                        return (
                      <div style={{ textAlign: 'center', padding: '0 4px' }}>
                        {vLeft != null && displayVal !== noDataLabel ? (
                          <>
                            <div className="perf-value" style={{
                              fontSize: '1.25rem', fontWeight: 900, lineHeight: 1,
                              color: winLeft ? winColor : tie ? tieColor : 'var(--text)',
                              display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 3,
                            }}>
                              <span>{displayVal}</span>
                              <span style={{ fontSize: '0.65rem', fontWeight: 500, color: 'var(--text-muted)' }}>{displayUnit}</span>
                              {winLeft && <span style={{ fontSize: '0.85rem', marginLeft: 2 }}>🏆</span>}
                            </div>
                            {comparable && <div style={{ height: 6, background: 'var(--border)', borderRadius: 999, marginTop: 7, overflow: 'hidden' }}>
                              <div className="perf-bar-fill" style={{
                                width: `${Math.max(pLeft, 6)}%`,
                                height: '100%',
                                background: winLeft ? winColor : tie ? tieColor : neutralColor,
                                borderRadius: 999,
                              }} />
                            </div>}
                          </>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{noDataLabel}</span>
                        )}
                      </div>
                        );
                      })()}

                      {/* Right column value */}
                      {(() => {
                        const isRightA = swapCols;
                        const isElecRight = isRightA ? isElectricA : isElectricB;
                        const consumption = isRightA ? consumptionA : consumptionB;
                        const displayVal = stat.key === 'fuel' && consumption
                          ? formatConsumption(consumption) : (vRight != null ? stat.format(vRight) : null);
                        const displayUnit = stat.key === 'fuel' && vRight != null
                          ? fuelUnit(vRight, isElecRight) : stat.unit;
                        return (
                      <div style={{ textAlign: 'center', padding: '0 4px' }}>
                        {vRight != null && displayVal !== noDataLabel ? (
                          <>
                            <div className="perf-value" style={{
                              fontSize: '1.25rem', fontWeight: 900, lineHeight: 1,
                              color: winRight ? winColor : tie ? tieColor : 'var(--text)',
                              display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 3,
                            }}>
                              {winRight && <span style={{ fontSize: '0.85rem', marginRight: 2 }}>🏆</span>}
                              <span>{displayVal}</span>
                              <span style={{ fontSize: '0.65rem', fontWeight: 500, color: 'var(--text-muted)' }}>{displayUnit}</span>
                            </div>
                            {comparable && <div style={{ height: 6, background: 'var(--border)', borderRadius: 999, marginTop: 7, overflow: 'hidden' }}>
                              <div className="perf-bar-fill" style={{
                                width: `${Math.max(pRight, 6)}%`,
                                height: '100%',
                                background: winRight ? winColor : tie ? tieColor : neutralColor,
                                borderRadius: 999,
                              }} />
                            </div>}
                          </>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{noDataLabel}</span>
                        )}
                      </div>
                        );
                      })()}
                    </div>
                  );
                })}

                {/* Footer note */}
                <div style={{ padding: '10px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-muted)' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {tr({
                      he: 'הערך הטוב ביותר בין גימורי הדגם. מחיר מוצג הוא המחיר המומלץ ההתחלתי.',
                      en: 'Best available value per model. Price shown is starting MSRP.',
                      ru: 'Лучшее значение среди комплектаций модели. Цена — начальная по израильскому прайс-листу.',
                    })}
                  </span>
                </div>
              </div>
            </>
          );
        })()}

        {/* Price History Chart - self-hides when no data for both cars */}
        <div style={{ marginBottom: 28 }}>
          <PriceHistoryChart
            cars={priceCars}
            isEn={isEn}
            lang={locale}
            withCard={tr({ he: 'שווי שוק יד שניה לפי שנת ייצור', en: 'Used Car Market Value by Year', ru: 'Стоимость на вторичном рынке по году выпуска' })}
          />
        </div>

        {/* Pros & Cons - only shown for Hebrew locale (data is Hebrew from DB) */}
        {(prosA.length > 0 || prosB.length > 0 || consA.length > 0 || consB.length > 0) && (
          <div className="card" style={{ padding: '24px 28px', marginBottom: 28 }}>
            <h2 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: isRu ? 4 : 20 }}>{sp.prosAndConsTitle}</h2>
            {/* Russian: translated pros/cons where available; English fallback is labelled */}
            {isRu && <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ruHasEnglish ? 'Из обзоров и отзывов владельцев; частично на английском языке.' : 'Из обзоров и отзывов владельцев.'}</p>}
            <div className="cmp-proscons-flex" style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 700, marginBottom: 12, fontSize: '0.9rem' }}>{nameA}</div>
                {prosA.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: '0.875rem' }}>
                    <span style={{ color: '#16a34a', flexShrink: 0 }}>✓</span>
                    <span style={{ color: 'var(--text-muted)' }}>{p}</span>
                  </div>
                ))}
                {consA.map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--accent)', flexShrink: 0 }}>✗</span>
                    <span style={{ color: 'var(--text-muted)' }}>{c}</span>
                  </div>
                ))}
                {consA.length > 0 && (
                  <Link href={`/cars/${make1}/${model1}/issues`} style={{ fontSize: '0.8125rem', color: 'var(--accent)', textDecoration: 'none', display: 'block', marginTop: 8 }}>
                    {nameA} - {heLink(sp.issuesLink)}
                  </Link>
                )}
              </div>
              <div className="cmp-proscons-vdiv" style={{ width: 1, background: 'var(--border)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 700, marginBottom: 12, fontSize: '0.9rem' }}>{nameB}</div>
                {prosB.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: '0.875rem' }}>
                    <span style={{ color: '#16a34a', flexShrink: 0 }}>✓</span>
                    <span style={{ color: 'var(--text-muted)' }}>{p}</span>
                  </div>
                ))}
                {consB.map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--accent)', flexShrink: 0 }}>✗</span>
                    <span style={{ color: 'var(--text-muted)' }}>{c}</span>
                  </div>
                ))}
                {consB.length > 0 && (
                  <Link href={`/cars/${make2}/${model2}/issues`} style={{ fontSize: '0.8125rem', color: 'var(--accent)', textDecoration: 'none', display: 'block', marginTop: 8 }}>
                    {nameB} - {heLink(sp.issuesLink)}
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Verdict */}
        {hasVerdict && (() => {
          const winner = verdictWinner;
          return (
            <div className="card" style={{ padding: '24px 28px', marginBottom: 28, borderInlineStart: '4px solid var(--accent)' }}>
              <h2 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 12 }}>{sp.verdictTitle}</h2>
              {winner && winner !== 'tie' ? (
                <p style={{ margin: 0, fontSize: '0.9375rem', lineHeight: 1.7, color: 'var(--text-muted)' }}>
                  {verdictBasis} <strong>{winnerName}</strong> {sp.verdictWinnerMid} {loserName}.
                  {(expertA[0]?.pros?.length ?? 0) > 0 || (expertB[0]?.pros?.length ?? 0) > 0 ? ` ${sp.verdictHasPros}` : ''}
                </p>
              ) : (
                <p style={{ margin: 0, fontSize: '0.9375rem', lineHeight: 1.7, color: 'var(--text-muted)' }}>
                  {sp.verdictTie}
                </p>
              )}
              <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {tr({ he: 'מבוסס על נתונים רשמיים', en: 'Based on official data', ru: 'На основе официальных данных' })}
              </div>
            </div>
          );
        })()}

        {/* AI comparison, recall list and owner-review highlights have Hebrew/English text only */}
        {!isRu && <CarComparisonAI
          make1={make1} model1={model1}
          make2={make2} model2={model2}
          nameAhe={`${mA.nameHe} ${modA.nameHe}`}
          nameBhe={`${mB.nameHe} ${modB.nameHe}`}
          nameAen={`${mA.nameEn} ${modA.nameEn}`}
          nameBen={`${mB.nameEn} ${modB.nameEn}`}
          locale={isEn ? 'en' : 'he'}
        />}
        {!isRu && <RecallsCompare
          make1={make1} model1={model1} name1={nameA}
          make2={make2} model2={model2} name2={nameB}
          make1En={mA.nameEn} model1En={modA.nameEn}
          make2En={mB.nameEn} model2En={modB.nameEn}
          locale={isEn ? 'en' : 'he'}
        />}
        {!isRu && <ReviewsCompare
          make1={make1} model1={model1} name1={nameA}
          make2={make2} model2={model2} name2={nameB}
          locale={isEn ? 'en' : 'he'}
        />}
        {/* FAQ - built only from data shown on this page; mirrored exactly in FAQPage JSON-LD */}
        {faqItems.length > 0 && (
          <section className="card" style={{ padding: '24px 28px', marginBottom: 28 }}>
            <h2 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 16 }}>{tr({ he: 'שאלות נפוצות', en: 'Frequently asked questions', ru: 'Частые вопросы' })}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {faqItems.map((f, i) => (
                <div key={i}>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: '0 0 6px' }}>{f.q}</h3>
                  <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--text-muted)' }}>{f.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA to interactive compare */}
        <div className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
          <div>
            <div style={{ fontWeight: 700 }}>{sp.ctaTitle}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{isRu ? 'Все сравнения на русском' : sp.ctaSubtitle}</div>
          </div>
          <Link href={isRu ? '/ru#compare' : `/cars/compare?car1=${make1}/${model1}&car2=${make2}/${model2}`} className="btn btn-primary" style={{ height: 40, padding: '0 20px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            {isRu ? 'Все сравнения →' : sp.ctaButton}
          </Link>
        </div>

        {/* Related comparisons */}
        {(relA.length > 0 || relB.length > 0) && (
          <div style={{ marginTop: 8 }}>
            <h2 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 16 }}>{sp.relatedTitle}</h2>
            <div className="cmp-related-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {nameA} {sp.vsGroup}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {relA.map(s => {
                    return (
                      <Link key={s.key} href={s.href}
                        style={{ fontSize: '0.875rem', color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>⚖️</span>
                        {isRu ? <>{nameA} или {s.name}</> : <>{nameA} vs {s.name}</>}
                      </Link>
                    );
                  })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {nameB} {sp.vsGroup}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {relB.map(s => {
                    return (
                      <Link key={s.key} href={s.href}
                        style={{ fontSize: '0.875rem', color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>⚖️</span>
                        {isRu ? <>{nameB} или {s.name}</> : <>{nameB} vs {s.name}</>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* JSON-LD */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify((() => {
          const base = isRu ? 'https://carissues.co.il/ru' : getBaseUrl(locale);
          const pageUrl = `${base}/cars/compare/${make1}/${model1}/${make2}/${model2}`;

          // No Product / aggregateRating here: owner ratings are marked up only on each
          // model's own page, not repeated on comparison pages.
          return {
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'WebPage',
                name: `${nameA} ${sp.vsWord} ${nameB}`,
                url: pageUrl,
                description: `${nameA} ${sp.vsWord} ${nameB}`,
              },
              {
                '@type': 'BreadcrumbList',
                itemListElement: [
                  { '@type': 'ListItem', position: 1, name: sp.breadcrumbHome, item: base },
                  { '@type': 'ListItem', position: 2, name: sp.breadcrumbCompare, item: isRu ? `${base}#compare` : `${base}/cars/compare` },
                  { '@type': 'ListItem', position: 3, name: `${nameA} ${sp.vsWord} ${nameB}`, item: pageUrl },
                ],
              },
              ...(faqItems.length > 0 ? [{
                '@type': 'FAQPage',
                inLanguage: locale,
                mainEntity: faqItems.map(f => ({
                  '@type': 'Question',
                  name: f.q,
                  acceptedAnswer: { '@type': 'Answer', text: f.a },
                })),
              }] : []),
            ],
          };
        })())}} />
      </div>
    </div>
  );
}
