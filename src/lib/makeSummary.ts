/**
 * Data-built intro for make pages: every sentence is filled from the catalogue, trim prices,
 * owner reviews, AI scores (labelled), NHTSA recalls and CarComplaints — and dropped when
 * the data behind it is missing.
 */
import { dbAll } from './db';
import { getModelPriceMins } from './trimSpecsDb';
import { getCategoryLabel, type CarMake } from '@/data/cars';
import { fmtIls, kmPerL, summarizeTrims, type TrimLike } from './specSummary';

export interface MakeStats {
  categories: { cat: string; count: number }[];
  yearMin: number | null;
  yearMax: number | null;
  prices: { slug: string; price: number }[];          // cheapest first
  rated: { slug: string; avg: number; count: number }[]; // owner reviews, best first
  reviewTotal: number;
  aiScores: { slug: string; score: number }[];        // best first
  recallTotal: number;
  recallTopModels: { slug: string; count: number }[];
  recallComponents: string[];
  knownIssues: { slug: string; title: string }[];
  hpRange: [number, number] | null;
  bestFuel: { slug: string; lPer100: number } | null;
  biggestCargo: { slug: string; liters: number } | null;
}

export async function getMakeStats(make: CarMake): Promise<MakeStats> {
  const [priceMins, reviews, scores, recalls, issues, trims] = await Promise.all([
    getModelPriceMins().catch(() => new Map<string, number>()),
    dbAll<{ model_slug: string; n: number; avg: number }>(
      'SELECT model_slug, COUNT(*) AS n, AVG(rating) AS avg FROM reviews WHERE make_slug = ? GROUP BY model_slug', make.slug,
    ).catch(() => []),
    dbAll<{ model_slug: string; top_score: number }>(
      'SELECT model_slug, top_score FROM expert_reviews WHERE make_slug = ? AND year IS NULL AND top_score IS NOT NULL', make.slug,
    ).catch(() => []),
    dbAll<{ model: string; component_he: string | null }>(
      'SELECT model, component_he FROM recalls_cache WHERE make = ?', make.nameEn.toLowerCase(),
    ).catch(() => []),
    dbAll<{ model_slug: string; title: string; rank: number | null }>(
      'SELECT model_slug, title, rank FROM known_issues WHERE make_slug = ? ORDER BY rank IS NULL, rank', make.slug,
    ).catch(() => []),
    dbAll<{ model_slug: string; engine_hp: number | null; fuel_consumption: number | null; cargo_liters: number | null; engine_type: string | null; price_ils: number | null }>(
      'SELECT model_slug, engine_hp, fuel_consumption, cargo_liters, engine_type, price_ils FROM car_trims WHERE make_slug = ? AND is_israel = 1', make.slug,
    ).catch(() => []),
  ]);
  const slugs = new Set(make.models.map((m) => m.slug));
  const byEnName = new Map(make.models.map((m) => [m.nameEn.toLowerCase(), m.slug]));

  const catCount = new Map<string, number>();
  for (const m of make.models) catCount.set(m.category, (catCount.get(m.category) ?? 0) + 1);
  const years = make.models.flatMap((m) => m.years);

  const recallByModel = new Map<string, number>();
  const compCount = new Map<string, number>();
  let recallTotal = 0;
  for (const r of recalls) {
    const slug = byEnName.get(r.model);
    if (!slug) continue; // only models covered on the site
    recallTotal++;
    recallByModel.set(slug, (recallByModel.get(slug) ?? 0) + 1);
    const comp = (r.component_he ?? '').split(':')[0].split(',')[0].trim();
    if (comp) compCount.set(comp, (compCount.get(comp) ?? 0) + 1);
  }

  const seenIssueModel = new Set<string>();
  const knownIssues: MakeStats['knownIssues'] = [];
  for (const i of issues) {
    if (!slugs.has(i.model_slug) || seenIssueModel.has(i.model_slug)) continue;
    seenIssueModel.add(i.model_slug);
    knownIssues.push({ slug: i.model_slug, title: i.title });
  }

  // Per-model spec summaries (sanity-checked; fuel from combustion trims only)
  const trimsByModel = new Map<string, TrimLike[]>();
  for (const t of trims) {
    if (!slugs.has(t.model_slug)) continue;
    const arr = trimsByModel.get(t.model_slug) ?? [];
    arr.push({ engineHp: t.engine_hp, fuelConsumption: t.fuel_consumption, cargoLiters: t.cargo_liters, engineType: t.engine_type, priceIls: t.price_ils });
    trimsByModel.set(t.model_slug, arr);
  }
  const specs = [...trimsByModel.entries()].map(([slug, ts]) => ({ slug, s: summarizeTrims(ts) }));
  const hps = specs.flatMap((x) => (x.s.hpMax ? [x.s.hpMax] : []));
  const allHpMins = trims.filter((t) => slugs.has(t.model_slug) && t.engine_hp && t.engine_hp >= 40 && t.engine_hp <= 1500).map((t) => t.engine_hp!);
  const fuel = specs.filter((x) => x.s.fuelBest).sort((a, b) => a.s.fuelBest! - b.s.fuelBest!)[0];
  const cargo = specs.filter((x) => x.s.cargoMax).sort((a, b) => b.s.cargoMax! - a.s.cargoMax!)[0];

  return {
    hpRange: hps.length && allHpMins.length ? [Math.min(...allHpMins), Math.max(...hps)] : null,
    bestFuel: fuel ? { slug: fuel.slug, lPer100: fuel.s.fuelBest! } : null,
    biggestCargo: cargo ? { slug: cargo.slug, liters: cargo.s.cargoMax! } : null,
    categories: [...catCount.entries()].map(([cat, count]) => ({ cat, count })).sort((a, b) => b.count - a.count),
    yearMin: years.length ? Math.min(...years) : null,
    yearMax: years.length ? Math.max(...years) : null,
    prices: make.models.flatMap((m) => {
      const p = priceMins.get(`${make.slug}/${m.slug}`);
      return p ? [{ slug: m.slug, price: p }] : [];
    }).sort((a, b) => a.price - b.price),
    rated: reviews.filter((r) => slugs.has(r.model_slug)).map((r) => ({ slug: r.model_slug, avg: r.avg, count: r.n }))
      .sort((a, b) => b.avg - a.avg || b.count - a.count),
    reviewTotal: reviews.filter((r) => slugs.has(r.model_slug)).reduce((s, r) => s + r.n, 0),
    aiScores: scores.filter((s) => slugs.has(s.model_slug)).map((s) => ({ slug: s.model_slug, score: s.top_score }))
      .sort((a, b) => b.score - a.score),
    recallTotal,
    recallTopModels: [...recallByModel.entries()].map(([slug, count]) => ({ slug, count })).sort((a, b) => b.count - a.count).slice(0, 3),
    recallComponents: [...compCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c),
    knownIssues: knownIssues.slice(0, 3),
  };
}

/** Plain-text paragraphs (no markup) — rendered by the make page. */
export function buildMakeIntro(make: CarMake, st: MakeStats, locale: 'he' | 'en'): string[] {
  const en = locale === 'en';
  const name = (slug: string) => {
    const m = make.models.find((x) => x.slug === slug);
    return m ? (en ? `${make.nameEn} ${m.nameEn}` : `${make.nameHe} ${m.nameHe}`) : slug;
  };
  // Hebrew one-letter prefix: attached to Hebrew words, hyphenated before Latin text or digits
  const hp = (prefix: string, s: string) => (/^[\u0590-\u05FF]/.test(s) ? `${prefix}${s}` : `${prefix}-${s}`);
  const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : en
    ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`
    : `${xs.slice(0, -1).join(', ')} ${hp('ו', xs[xs.length - 1])}`);
  const mk = en ? make.nameEn : make.nameHe;
  const out: string[] = [];

  // 1. Coverage
  const cats = st.categories.map((c) => `${c.count} ${getCategoryLabel(c.cat as never, locale)}`);
  const years = st.yearMin && st.yearMax ? (en ? `, model years ${st.yearMin}–${st.yearMax}` : `, משנתון ${st.yearMin} ועד ${st.yearMax}`) : '';
  out.push(en
    ? `CarIssues covers ${make.models.length} ${make.nameEn} models (${list(cats)})${years}. Each model page brings together owner reviews, common problems, safety recalls, trim prices and specs.`
    : `ב-CarIssues יש מידע על ${make.models.length} דגמים של ${make.nameHe} (${make.nameEn}) — ${list(cats)}${years}. בכל דף דגם מרוכזים ביקורות בעלים, בעיות נפוצות, ריקולים, מחירון גרסאות ומפרט.`);

  // 1b. Models by body type
  const byCat = st.categories.map((c) => {
    const names = make.models.filter((m) => m.category === c.cat).map((m) => (en ? m.nameEn : m.nameHe));
    return `${getCategoryLabel(c.cat as never, locale)}: ${names.join(', ')}`;
  });
  if (byCat.length) out.push(en ? `Models by body type — ${byCat.join('; ')}.` : `הדגמים לפי סוג מרכב — ${byCat.join('; ')}.`);

  // 2. Prices in Israel
  if (st.prices.length >= 2) {
    const lo = st.prices[0], hi = st.prices[st.prices.length - 1];
    out.push(en
      ? `The trim price list on CarIssues has Israeli prices for ${st.prices.length} ${make.nameEn} models: the most affordable is the ${name(lo.slug)} from ${fmtIls(lo.price)}, and the most expensive the ${name(hi.slug)} from ${fmtIls(hi.price)}.`
      : `במחירון הגרסאות באתר יש מחירים בישראל ל-${st.prices.length} דגמים של ${make.nameHe}: הנגיש ביותר הוא ${name(lo.slug)} החל מ-${fmtIls(lo.price)}, והיקר ביותר ${name(hi.slug)} החל מ-${fmtIls(hi.price)}.`);
  } else if (st.prices.length === 1) {
    out.push(en
      ? `Israeli trim prices are on file for one ${make.nameEn} model so far: the ${name(st.prices[0].slug)}, from ${fmtIls(st.prices[0].price)}.`
      : `בינתיים יש במחירון האתר מחיר לדגם אחד של ${make.nameHe}: ${name(st.prices[0].slug)}, החל מ-${fmtIls(st.prices[0].price)}.`);
  }

  // 2b. Specs across the range
  const specParts: string[] = [];
  if (st.hpRange && st.hpRange[0] !== st.hpRange[1]) specParts.push(en ? `power ranges from ${st.hpRange[0]} to ${st.hpRange[1]} hp` : `ההספק נע בין ${st.hpRange[0]} ל-${st.hpRange[1]} כ"ס`);
  if (st.bestFuel) specParts.push(en ? `the most fuel-efficient is the ${name(st.bestFuel.slug)} (up to ${kmPerL(st.bestFuel.lPer100)} km/L, manufacturer figure)` : `הדגם החסכוני ביותר בדלק הוא ${name(st.bestFuel.slug)} (עד ${kmPerL(st.bestFuel.lPer100)} ק"מ לליטר לפי נתון היצרן)`);
  if (st.biggestCargo) specParts.push(en ? `the biggest boot is in the ${name(st.biggestCargo.slug)} (${st.biggestCargo.liters} L)` : `תא המטען הגדול ביותר הוא של ${name(st.biggestCargo.slug)} (${st.biggestCargo.liters} ליטר)`);
  if (specParts.length) out.push(en ? `In the trim specs on file, ${list(specParts)}.` : `לפי נתוני המפרט באתר, ${list(specParts)}.`);

  // 3. Owner reviews (best / worst) — only real reviews
  if (st.rated.length >= 2) {
    const best = st.rated[0], worst = st.rated[st.rated.length - 1];
    out.push(en
      ? `Across ${st.reviewTotal} owner reviews on CarIssues, the best-rated ${make.nameEn} is the ${name(best.slug)} (${best.avg.toFixed(1)}/5 from ${best.count}) and the lowest-rated the ${name(worst.slug)} (${worst.avg.toFixed(1)}/5 from ${worst.count}).`
      : `מתוך ${st.reviewTotal} ביקורות בעלים באתר, הדגם עם הדירוג הגבוה ביותר הוא ${name(best.slug)} (${best.avg.toFixed(1)} מתוך 5, ${best.count === 1 ? 'ביקורת אחת' : `${best.count} ביקורות`}) והנמוך ביותר ${name(worst.slug)} (${worst.avg.toFixed(1)} מתוך 5, ${worst.count === 1 ? 'ביקורת אחת' : `${worst.count} ביקורות`}).`);
  } else if (st.rated.length === 1) {
    const r = st.rated[0];
    out.push(en
      ? `So far owners have reviewed only the ${name(r.slug)} on CarIssues (${r.avg.toFixed(1)}/5 from ${r.count}). Own a ${make.nameEn}? Your review helps other buyers.`
      : `בינתיים יש באתר ביקורות בעלים רק על ${name(r.slug)} (${r.avg.toFixed(1)} מתוך 5). יש לכם ${make.nameHe}? ביקורת שלכם תעזור לקונים אחרים.`);
  } else {
    out.push(en
      ? `There are no owner reviews for ${make.nameEn} models on CarIssues yet — own one? Be the first to review it.`
      : `עדיין אין באתר ביקורות בעלים על דגמי ${make.nameHe} — יש לכם אחד? היו הראשונים לכתוב ביקורת.`);
  }

  // 4. AI scores (clearly labelled as AI)
  if (st.aiScores.length >= 2) {
    const best = st.aiScores[0], worst = st.aiScores[st.aiScores.length - 1];
    out.push(en
      ? `In our AI summaries (not owner ratings), the highest-scoring ${make.nameEn} is the ${name(best.slug)} (${best.score.toFixed(1)}/10) and the lowest the ${name(worst.slug)} (${worst.score.toFixed(1)}/10).`
      : `בסיכומי ה-AI שלנו (לא דירוג בעלים), הציון הגבוה ביותר שייך ${hp('ל', name(best.slug))} (${best.score.toFixed(1)} מתוך 10) והנמוך ביותר ${hp('ל', name(worst.slug))} (${worst.score.toFixed(1)} מתוך 10).`);
  }

  // 5. Reported issues: recalls + complaint sites
  if (st.recallTotal > 0) {
    const top = st.recallTopModels.map((m) => (en ? `${name(m.slug)} (${m.count})` : `${name(m.slug)} (${m.count})`));
    const comps = st.recallComponents.length ? (en ? ` The components recalled most often: ${list(st.recallComponents)}.` : ` הרכיבים שחוזרים הכי הרבה בקריאות: ${list(st.recallComponents)}.`) : '';
    out.push(en
      ? `NHTSA (US) records ${st.recallTotal} recalls for the ${make.nameEn} models covered here; the most recalled are ${list(top)}.${comps}`
      : `במאגר הריקולים של NHTSA (ארה"ב) מתועדות ${st.recallTotal} קריאות ריקול לדגמי ${make.nameHe} שבאתר; הכי הרבה קריאות היו ${hp('ל', list(top))}.${comps}`);
  }
  if (st.knownIssues.length > 0) {
    const items = st.knownIssues.map((k) => `${name(k.slug)}: ${k.title}`);
    out.push(en
      ? `Most-reported owner complaints on CarComplaints.com include ${list(items)}.`
      : `בין התלונות הנפוצות של בעלי ${mk} באתר CarComplaints.com (באנגלית): ${list(items)}.`);
  }
  return out;
}
