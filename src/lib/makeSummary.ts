/**
 * Data-backed intro text for a make page (/cars/[make]): built only from what the
 * site has on file - the model catalogue, Israeli registry counts
 * (car_models.active_vehicles_il), Israeli trim prices, owner reviews, known-issue
 * lists and cached US recall campaigns. A sentence is left out when its data is
 * missing; nothing is generated or estimated.
 */
import type { CarMake, CarModel } from '@/data/cars';
import { dbAll } from './db';
import { getModelPriceMins } from './trimSpecsDb';
import { getCategoryLabel } from './carsDb';

const MIN_REVIEWS_FOR_RATING = 3;

export interface MakeSummary {
  paragraphs: string[];
  /** Up to three models to link from the text, most common on Israeli roads first. */
  topModels: { slug: string; name: string }[];
}

const fmtInt = (n: number, isEn: boolean) => n.toLocaleString(isEn ? 'en-US' : 'he-IL');

function joinList(items: string[], isEn: boolean): string {
  if (items.length <= 1) return items.join('');
  const last = items[items.length - 1];
  return `${items.slice(0, -1).join(', ')}${isEn ? ' and ' : ' ו'}${last}`;
}

export async function getMakeSummary(make: CarMake, locale: 'he' | 'en'): Promise<MakeSummary> {
  const isEn = locale === 'en';
  const name = (m: CarModel) => (isEn ? m.nameEn : m.nameHe);
  const makeName = isEn ? make.nameEn : make.nameHe;
  const bySlug = new Map(make.models.map((m) => [m.slug, m]));
  const recallKey = new Map(make.models.map((m) => [m.nameEn.toLowerCase(), m]));

  const [reviews, recalls, issues, prices] = await Promise.all([
    dbAll<{ model_slug: string; n: number; avg: number }>(
      'SELECT model_slug, COUNT(*) AS n, AVG(rating) AS avg FROM reviews WHERE make_slug = ? GROUP BY model_slug',
      make.slug,
    ).catch(() => []),
    dbAll<{ model: string; n: number }>(
      'SELECT model, COUNT(DISTINCT id) AS n FROM recalls_cache_models WHERE make = ? GROUP BY model',
      make.nameEn.toLowerCase(),
    ).catch(() => []),
    dbAll<{ model_slug: string }>(
      'SELECT DISTINCT model_slug FROM known_issues WHERE make_slug = ?',
      make.slug,
    ).catch(() => []),
    getModelPriceMins().catch(() => new Map<string, number>()),
  ]);

  const paragraphs: string[] = [];

  // 1. Line-up and what is on Israeli roads.
  const cats = [...new Set(make.models.map((m) => m.category))].map((c) => getCategoryLabel(c, locale));
  const allYears = make.models.flatMap((m) => m.years);
  const yearSpan = allYears.length ? `${Math.min(...allYears)}-${Math.max(...allYears)}` : '';
  const onRoad = make.models
    .filter((m) => (m.activeVehiclesIl ?? 0) > 0)
    .sort((a, b) => (b.activeVehiclesIl ?? 0) - (a.activeVehiclesIl ?? 0));
  const totalOnRoad = onRoad.reduce((s, m) => s + (m.activeVehiclesIl ?? 0), 0);
  const topModels = onRoad.slice(0, 3);
  let p1 = isEn
    ? `CarIssues covers ${make.models.length} ${make.nameEn} models${yearSpan ? ` from the ${yearSpan} model years` : ''}: ${joinList(cats, true)}.`
    : `באתר מופיעים ${make.models.length} דגמים של ${make.nameHe}${yearSpan ? ` משנות הדגם ${yearSpan}` : ''}, בקטגוריות ${joinList(cats, false)}.`;
  if (topModels.length) {
    const list = topModels.map((m) => `${name(m)} (${fmtInt(m.activeVehiclesIl!, isEn)})`);
    p1 += isEn
      ? ` According to the Israeli Ministry of Transport registry there are about ${fmtInt(totalOnRoad, true)} active ${make.nameEn} vehicles of these models in Israel; the most common are ${joinList(list, true)}.`
      : ` לפי מאגר הרכב של משרד התחבורה, על הכביש בישראל יש כ-${fmtInt(totalOnRoad, false)} רכבים פעילים מדגמים אלה. הנפוצים ביותר: ${joinList(list, false)}.`;
  }
  paragraphs.push(p1);

  // 2. Israeli prices (Hebrew site only - the trim price list is Israeli).
  if (!isEn) {
    const priced = make.models
      .map((m) => ({ m, p: prices.get(`${make.slug}/${m.slug}`) }))
      .filter((x): x is { m: CarModel; p: number } => x.p != null)
      .sort((a, b) => a.p - b.p);
    if (priced.length >= 2) {
      const lo = priced[0];
      const hi = priced[priced.length - 1];
      paragraphs.push(`במחירון הגרסאות שבאתר יש מחיר ל-${priced.length} דגמים של ${make.nameHe}. הדגם עם המחיר ההתחלתי הנמוך ביותר הוא ${name(lo.m)}, החל מ-₪${fmtInt(lo.p, false)}, והיקר ביותר הוא ${name(hi.m)}, החל מ-₪${fmtInt(hi.p, false)}.`);
    } else if (priced.length === 1) {
      paragraphs.push(`במחירון הגרסאות שבאתר יש מחיר לדגם ${name(priced[0].m)}: החל מ-₪${fmtInt(priced[0].p, false)}.`);
    }
  }

  // 3. Owner reviews.
  const reviewRows = reviews.filter((r) => bySlug.has(r.model_slug));
  const totalReviews = reviewRows.reduce((s, r) => s + r.n, 0);
  if (totalReviews > 0) {
    const avgAll = reviewRows.reduce((s, r) => s + r.avg * r.n, 0) / totalReviews;
    const rated = reviewRows.filter((r) => r.n >= MIN_REVIEWS_FOR_RATING).sort((a, b) => b.avg - a.avg);
    let p = isEn
      ? `Owners have posted ${totalReviews} reviews of ${make.nameEn} models on the site, with an average rating of ${avgAll.toFixed(1)}/5.`
      : `בעלי רכב פרסמו באתר ${totalReviews} ביקורות על דגמי ${make.nameHe}, עם דירוג ממוצע של ${avgAll.toFixed(1)} מתוך 5.`;
    if (rated.length >= 2) {
      const best = rated[0];
      const worst = rated[rated.length - 1];
      const bm = bySlug.get(best.model_slug)!;
      const wm = bySlug.get(worst.model_slug)!;
      p += isEn
        ? ` Among models with at least ${MIN_REVIEWS_FOR_RATING} reviews, the highest rated is the ${name(bm)} (${best.avg.toFixed(1)}, ${best.n} reviews) and the lowest is the ${name(wm)} (${worst.avg.toFixed(1)}, ${worst.n} reviews).`
        : ` מבין הדגמים עם ${MIN_REVIEWS_FOR_RATING} ביקורות לפחות, הדירוג הגבוה ביותר הוא של ${name(bm)} (${best.avg.toFixed(1)}, ${best.n} ביקורות) והנמוך ביותר של ${name(wm)} (${worst.avg.toFixed(1)}, ${worst.n} ביקורות).`;
    }
    paragraphs.push(p);
  }

  // 4. Known problems and recalls.
  const withIssues = issues.filter((r) => bySlug.has(r.model_slug)).length;
  const recallRows = recalls
    .map((r) => ({ m: recallKey.get(r.model), n: r.n }))
    .filter((r): r is { m: CarModel; n: number } => !!r.m)
    .sort((a, b) => b.n - a.n);
  const totalRecalls = recallRows.reduce((s, r) => s + r.n, 0);
  const parts: string[] = [];
  if (withIssues > 0) {
    parts.push(isEn
      ? `${withIssues} of the ${make.models.length} models have a list of commonly reported problems, collected from owner reports and repair data.`
      : `ל-${withIssues} מתוך ${make.models.length} הדגמים יש באתר רשימת בעיות נפוצות, שנאספה מדיווחי בעלים ומנתוני תיקונים.`);
  }
  if (totalRecalls > 0) {
    const top = recallRows.slice(0, 2).map((r) => `${name(r.m)} (${r.n})`);
    parts.push(isEn
      ? `The US recall records on file list ${totalRecalls} recall campaigns across ${recallRows.length} ${make.nameEn} models; the models with the most are the ${joinList(top, true)}. US recalls don't always apply to cars sold in Israel; each model page lists the details.`
      : `ברשומות קריאות החזרה (ריקולים) מארה״ב שבמאגר מופיעים ${totalRecalls} קמפיינים ל-${recallRows.length} דגמי ${make.nameHe}. הכי הרבה קמפיינים: ${joinList(top, false)}. ריקול בארה״ב לא תמיד חל על רכבים שנמכרו בישראל; הפרטים מופיעים בעמוד של כל דגם.`);
  }
  if (parts.length) paragraphs.push(parts.join(' '));

  return {
    paragraphs: paragraphs.length > 1 || topModels.length ? paragraphs : [],
    topModels: topModels.map((m) => ({ slug: m.slug, name: `${makeName} ${name(m)}` })),
  };
}
