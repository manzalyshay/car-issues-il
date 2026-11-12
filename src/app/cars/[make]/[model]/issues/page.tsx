import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMakeBySlug, getModelBySlug } from '@/lib/carsDb';
import { getExpertReviews } from '@/lib/expertReviews';
import { getReviewsForModel } from '@/lib/reviewsDb';
import { getRepairCosts } from '@/lib/repairCostsDb';
import { getRecallsFromCache } from '@/lib/recallsDb';
import { cache } from 'react';
import { getAllMakes } from '@/lib/carsDb';
import { getIsraeliRecalls, buildWindowOverlaps, type IsraeliRecall } from '@/lib/israeliRecallsDb';
import { getKnownIssues, knownIssueSourceLabel } from '@/lib/knownIssuesDb';
import { comparePairsForModel } from '@/lib/comparePairs';
import { realItems } from '@/lib/faqData';
import {
  summarizeIlRecalls, buildIssuesIntro, buildIssuesDescription, buildYearsLabel, faultLabel,
} from '@/lib/issuesSummary';
import MakeLogo from '@/components/MakeLogo';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import { translations } from '@/lib/translations';

export const revalidate = 86400;

interface Props { params: Promise<{ make: string; model: string }> }

/** Israeli notices shown in full before the rest collapse into a <details>. */
const IL_RECALLS_OPEN = 8;

/**
 * Problem data for one model, shared by generateMetadata and the page (React cache
 * de-duplicates the queries within a request).
 *
 * Israeli Ministry of Transport notices are Hebrew-only text, so they are loaded for
 * the Hebrew site only, limited to notices whose production window overlaps the
 * model years the site covers.
 */
const loadIssuesData = cache(async (makeSlug: string, modelSlug: string, locale: 'he' | 'en') => {
  const [make, model] = await Promise.all([getMakeBySlug(makeSlug), getModelBySlug(makeSlug, modelSlug)]);
  if (!make || !model) return null;
  const isEn = locale === 'en';
  const [expertReviewsList, allReviews, repairCosts, recalls, ilAll, knownRaw] = await Promise.all([
    getExpertReviews(makeSlug, modelSlug).catch(() => []),
    getReviewsForModel(makeSlug, modelSlug).catch(() => []),
    getRepairCosts(model.category),
    getRecallsFromCache(make.nameEn, model.nameEn).catch(() => []),
    isEn ? Promise.resolve([] as IsraeliRecall[]) : getIsraeliRecalls(make.nameEn, model.nameEn).catch(() => []),
    getKnownIssues(makeSlug, modelSlug, 12),
  ]);
  const ilRecalls = model.years.length
    ? ilAll.filter((r) => buildWindowOverlaps(r, Math.min(...model.years), Math.max(...model.years)))
    : ilAll;
  // The same complaint is often listed once per generation - show each title once.
  const seen = new Set<string>();
  const knownIssues = knownRaw.filter((k) => {
    const key = k.title.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const expertReview = expertReviewsList[0] ?? null;
  const cons = realItems(isEn ? expertReview?.consEn : expertReview?.cons);
  const pros = realItems(isEn ? expertReview?.prosEn : expertReview?.pros);
  const facts = {
    makeName: isEn ? make.nameEn : make.nameHe,
    modelName: isEn ? model.nameEn : model.nameHe,
    il: summarizeIlRecalls(ilRecalls),
    usRecallCount: recalls.length,
    cons,
  };
  return { make, model, expertReview, allReviews, repairCosts, recalls, ilRecalls, knownIssues, cons, pros, facts };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { make: makeSlug, model: modelSlug } = await params;
  const [locale, make, model] = await Promise.all([
    getHostLocale(),
    getMakeBySlug(makeSlug),
    getModelBySlug(makeSlug, modelSlug),
  ]);
  if (!make || !model) return {};
  const isEn = locale === 'en';
  const base = getBaseUrl(locale);
  const url = `${base}/cars/${make.slug}/${model.slug}/issues`;
  // carissues.net: an issues page with no English problem data (no expert-review cons or
  // summary, no owner reviews, no recalls) is a template shell - keep it out of the index.
  const data = await loadIssuesData(make.slug, model.slug, locale);
  let thinEn = false;
  if (isEn && data) {
    const e = data.expertReview;
    thinEn = !(e?.consEn?.length || e?.localSummaryEn) && data.allReviews.length === 0 && data.recalls.length === 0;
  }
  const dataDescription = data ? buildIssuesDescription(data.facts, locale) : null;
  const hasIlRecalls = (data?.ilRecalls.length ?? 0) > 0;
  return {
    ...(thinEn ? { robots: { index: false, follow: true } } : {}),
    title: isEn
      ? `${make.nameEn} ${model.nameEn} - Common Problems & Issues`
      : hasIlRecalls
        ? `${make.nameHe} ${model.nameHe} - תקלות נפוצות, ריקולים ובעיות`
        : `${make.nameHe} ${model.nameHe} - בעיות נפוצות ותקלות`,
    description: dataDescription ?? (isEn
      ? `What are the common problems with the ${make.nameEn} ${model.nameEn}? Reported issues, pros & cons, repair costs and real owner reviews.`
      : `אילו בעיות נפוצות יש ל${make.nameHe} ${model.nameHe}? תקלות מדווחות, חסרונות, עלויות תיקון וחוות דעת אמיתיות מבעלים בישראל.`),
    alternates: {
      canonical: url,
      languages: {
        he: `https://carissues.co.il/cars/${make.slug}/${model.slug}/issues`,
        en: `https://carissues.net/cars/${make.slug}/${model.slug}/issues`,
        'x-default': `https://carissues.net/cars/${make.slug}/${model.slug}/issues`,
      },
    },
    openGraph: {
      title: isEn
        ? `${make.nameEn} ${model.nameEn} - Common Problems`
        : `${make.nameHe} ${model.nameHe} - בעיות נפוצות`,
      description: isEn
        ? `Common issues, pros & cons, repair costs - ${make.nameEn} ${model.nameEn}`
        : `תקלות, חסרונות ועלויות תיקון - ${make.nameHe} ${model.nameHe}`,
      url,
    },
  };
}

export default async function IssuesPage({ params }: Props) {
  const { make: makeSlug, model: modelSlug } = await params;
  const locale = await getHostLocale();
  const data = await loadIssuesData(makeSlug, modelSlug, locale);
  if (!data) notFound();
  const { make, model, expertReview, allReviews, repairCosts, recalls, ilRecalls, knownIssues, cons, pros, facts } = data;
  const ip = translations[locale].issuesPage;
  const cp = translations[locale].carsPage;
  const isEn = locale === 'en';
  const makeName = isEn ? make.nameEn : make.nameHe;
  const modelName = isEn ? model.nameEn : model.nameHe;

  const base = getBaseUrl(locale);
  const intro = buildIssuesIntro(facts, locale);
  const il = facts.il;
  const fullName = `${makeName} ${modelName}`;
  const importer = ilRecalls.find((r) => r.importer)?.importer ?? null;
  const importerPhone = ilRecalls.find((r) => r.importer === importer && r.phone)?.phone ?? null;
  const makes = await getAllMakes().catch(() => []);
  const comparePairs = comparePairsForModel(makes, makeSlug, modelSlug, 4);
  const siblings = make.models.filter((m) => m.slug !== model.slug).slice(0, 8);
  const aiSummary = isEn ? expertReview?.localSummaryEn : expertReview?.localSummaryHe;

  // Reviews mentioning problems. English pages show only reviews with an English
  // translation (body_en), never the Hebrew original, and no Hebrew author names.
  const problemReviews = allReviews
    .map(r => (isEn ? { ...r, body: r.bodyEn ?? '', authorName: r.authorName && !/[\u0590-\u05FF]/.test(r.authorName) ? r.authorName : null } : r))
    .filter(r => (!isEn || !!r.body) && (r.rating <= 3 || (r.body && r.body.length > 50)))
    .slice(0, 5);

  const faqItems = [
    cons.length > 0 && {
      q: isEn
        ? `What are the common problems with the ${make.nameEn} ${model.nameEn}?`
        : `מה הבעיות הנפוצות של ${make.nameHe} ${model.nameHe}?`,
      a: cons.join('. '),
    },
    pros.length > 0 && {
      q: isEn
        ? `What are the pros of the ${make.nameEn} ${model.nameEn}?`
        : `מה היתרונות של ${make.nameHe} ${model.nameHe}?`,
      a: pros.join('. '),
    },
    ilRecalls.length > 0 && {
      q: `האם יש ריקול (קריאת שירות) ל${fullName} בישראל?`,
      a: `כן. במאגר משרד התחבורה ${il.total === 1 ? 'רשומה קריאת שירות אחת' : `רשומות ${il.total} קריאות שירות`} ל${fullName}${il.latestYear ? `, האחרונה משנת ${il.latestYear}` : ''}.${il.systems.length ? ` מערכות מעורבות: ${il.systems.slice(0, 4).map((x) => x.label).join(', ')}.` : ''} התיקון מבוצע אצל היבואן${importer ? ` (${importer})` : ''}.`,
    },
    ilRecalls.length > 0 && {
      q: `איך בודקים אם ל${fullName} מסוים יש ריקול פתוח?`,
      a: `הדרך הוודאית היא לפנות למוקד היבואן${importer ? ` ${importer}` : ''}${importerPhone ? ` בטלפון ${importerPhone}` : ''} עם מספר הרישוי. בדיקת הרכב לפי מספר ב-CarIssues מציגה את נתוני הרכב הרשמיים ואת קריאות השירות של הדגם.`,
    },
    recalls.length > 0 && {
      q: isEn
        ? `Have there been recalls for the ${make.nameEn} ${model.nameEn}?`
        : `האם היו ריקולים ל${make.nameHe} ${model.nameHe} בארה״ב?`,
      a: isEn
        ? `Yes, ${recalls.length} recall${recalls.length !== 1 ? 's have' : ' has'} been recorded. Components involved: ${recalls.slice(0, 3).map(r => r.component_en ?? r.component_he ?? '').filter(Boolean).join(', ')}.`
        : `כן, ${recalls.length === 1 ? 'תועד ריקול אחד' : `תועדו ${recalls.length} ריקולים`} בארה״ב. רכיבים מעורבים: ${recalls.slice(0, 3).map(r => r.component_he ?? r.component_en ?? '').filter(Boolean).join(', ')}.`,
    },
    repairCosts.length > 0 && {
      q: isEn
        ? `How much do repairs cost for the ${make.nameEn} ${model.nameEn}?`
        : `כמה עולים תיקונים ל${make.nameHe} ${model.nameHe}?`,
      a: isEn
        ? `Typical repair costs: ${repairCosts.slice(0, 3).map(r => `${r.repair_name_en ?? r.repair_name_he} ₪${r.cost_min_ils.toLocaleString()}–₪${r.cost_max_ils.toLocaleString()}`).join(', ')}.`
        : `עלויות תחזוקה: ${repairCosts.slice(0, 3).map(r => `${r.repair_name_he} ₪${r.cost_min_ils.toLocaleString()}–₪${r.cost_max_ils.toLocaleString()}`).join(', ')}.`,
    },
  ].filter(Boolean) as { q: string; a: string }[];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: isEn ? 'Home' : 'בית', item: base },
          { '@type': 'ListItem', position: 2, name: isEn ? 'Makes' : 'יצרנים', item: `${base}/cars` },
          { '@type': 'ListItem', position: 3, name: makeName, item: `${base}/cars/${make.slug}` },
          { '@type': 'ListItem', position: 4, name: modelName, item: `${base}/cars/${make.slug}/${model.slug}` },
          { '@type': 'ListItem', position: 5, name: isEn ? 'Common Problems' : 'בעיות נפוצות', item: `${base}/cars/${make.slug}/${model.slug}/issues` },
        ],
      },
      faqItems.length > 0 && {
        '@type': 'FAQPage',
        mainEntity: faqItems.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ].filter(Boolean),
  };

  return (
    <div className="page-section">
      <div className="container" style={{ maxWidth: 820 }}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

        {/* Breadcrumb */}
        <nav style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/cars" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{cp.makes}</Link>
          <span>›</span>
          <Link href={`/cars/${make.slug}`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{makeName}</Link>
          <span>›</span>
          <Link href={`/cars/${make.slug}/${model.slug}`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{modelName}</Link>
          <span>›</span>
          <span>{ip.breadcrumb}</span>
        </nav>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <MakeLogo logoUrl={make.logoUrl} nameEn={make.nameEn} size={44} />
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
              {makeName} {modelName} - {ip.titleSuffix}
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {[
                il.total > 0 && (il.total === 1 ? 'קריאת שירות אחת בישראל' : `${il.total} קריאות שירות בישראל`),
                recalls.length > 0 && (isEn ? `${recalls.length} US recall${recalls.length === 1 ? '' : 's'}` : `${recalls.length === 1 ? 'ריקול אחד' : `${recalls.length} ריקולים`} בארה״ב`),
                allReviews.length > 0 && `${ip.basedOn} ${allReviews.length} ${ip.ownerReviews}`,
              ].filter(Boolean).join(' · ') || fullName}
            </p>
          </div>
        </div>

        {/* Data-driven summary */}
        {intro && (
          <p style={{ fontSize: '0.95rem', lineHeight: 1.8, margin: '0 0 28px' }}>{intro}</p>
        )}

        {/* Israeli Ministry of Transport recall notices (Hebrew site only) */}
        {ilRecalls.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 6 }}>
              קריאות שירות (ריקול) ל{fullName} בישראל ({il.total})
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.6 }}>
              הודעות רשמיות של היבואן, מתוך מאגר קריאות השירות של משרד התחבורה (data.gov.il).
              {il.safety > 0 && ` ${il.safety === il.total ? 'כולן' : `${il.safety} מהן`} מסווגות כתקלה סדרתית בטיחותית.`}
            </p>
            {il.systems.length > 1 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {il.systems.map((x) => (
                  <span key={x.label} style={{ fontSize: '0.78rem', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 99, padding: '3px 10px' }}>
                    {x.label} · {x.count}
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ilRecalls.slice(0, IL_RECALLS_OPEN).map((r) => <IlRecallCard key={r.id} r={r} />)}
            </div>
            {ilRecalls.length > IL_RECALLS_OPEN && (
              <details style={{ marginTop: 10 }}>
                <summary style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent)', padding: '6px 0' }}>
                  עוד {ilRecalls.length - IL_RECALLS_OPEN} קריאות שירות קודמות
                </summary>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                  {ilRecalls.slice(IL_RECALLS_OPEN).map((r) => <IlRecallCard key={r.id} r={r} />)}
                </div>
              </details>
            )}
            <div style={{ marginTop: 14, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', fontSize: '0.85rem', lineHeight: 1.7 }}>
              <strong>רוצים לדעת מה חל על רכב מסוים?</strong>{' '}
              <Link href="/vehicle-lookup" style={{ color: 'var(--accent)', fontWeight: 700 }}>בדיקת רכב לפי מספר רישוי</Link>
              {' '}מציגה את נתוני הרכב הרשמיים: תוקף טסט, מספר בעלים וקילומטראז׳, לצד קריאות השירות של הדגם.
              {importer && (
                <> לתיאום תיקון: {importer}{importerPhone && <>, טלפון <span dir="ltr">{importerPhone}</span></>}.</>
              )}
            </div>
          </section>
        )}

        {/* Known issues from AI analysis */}
        {cons.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              {ip.reportedIssues}
            </h2>
            <div style={{ background: 'rgba(230,57,70,0.05)', border: '1px solid rgba(230,57,70,0.15)', borderRadius: 12, padding: '16px 20px' }}>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {cons.map((con, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: '0.9rem', lineHeight: 1.6 }}>
                    <span style={{ color: '#e63946', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✗</span>
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Pros */}
        {pros.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              {ip.pros}
            </h2>
            <div style={{ background: 'rgba(22,163,74,0.05)', border: '1px solid rgba(22,163,74,0.15)', borderRadius: 12, padding: '16px 20px' }}>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pros.map((pro, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: '0.9rem', lineHeight: 1.6 }}>
                    <span style={{ color: '#16a34a', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* AI summary */}
        {aiSummary && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12 }}>
              {ip.aiAnalysis}
            </h2>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.8, color: 'var(--text-muted)', background: 'var(--surface-2)', borderRadius: 10, padding: '14px 18px', margin: 0 }}>
              {aiSummary}
            </p>
          </section>
        )}

        {/* Complaints catalogued abroad */}
        {knownIssues.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 6 }}>
              {isEn ? `Most-reported ${fullName} complaints` : `תלונות נפוצות על ${fullName} בחו״ל`}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.6 }}>
              {isEn
                ? `Ranked by number of owner complaints. Source: ${knownIssueSourceLabel(knownIssues[0].source)}.`
                : `מדורגות לפי מספר תלונות הבעלים, בעיקר בשוק האמריקאי, ולכן לא כל תלונה רלוונטית לגרסה שנמכרת בישראל. מקור: ${knownIssueSourceLabel(knownIssues[0].source)}.`}
            </p>
            <ol dir="ltr" style={{ margin: 0, paddingInlineStart: 22, display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.9rem', lineHeight: 1.6, textAlign: 'left' }}>
              {knownIssues.map((k) => <li key={k.id}>{k.title}</li>)}
            </ol>
          </section>
        )}

        {/* Repair costs */}
        {repairCosts.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 14 }}>
              {ip.repairCosts}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
              {repairCosts.slice(0, 8).map(r => (
                <div key={r.repair_key + r.applies_to} style={{
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '10px 14px',
                }}>
                  <div style={{ fontSize: '0.825rem', fontWeight: 600, marginBottom: 3 }}>{isEn ? (r.repair_name_en ?? r.repair_name_he) : r.repair_name_he}</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent)' }}>
                    ₪{r.cost_min_ils.toLocaleString('he-IL')}–₪{r.cost_max_ils.toLocaleString('he-IL')}
                  </div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 10 }}>
              {ip.pricesNote} · <Link href="/repairs" style={{ color: 'var(--text-muted)' }}>{ip.allRepairCosts}</Link>
            </p>
          </section>
        )}

        {/* Recalls */}
        {recalls.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              {isEn ? `⚠️ Recall${recalls.length === 1 ? '' : 's'} (${recalls.length})` : `⚠️ ריקולים ל${fullName} בארה״ב (${recalls.length})`}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recalls.slice(0, 8).map(r => {
                const component = isEn ? (r.component_en ?? r.component_he) : (r.component_he ?? r.component_en);
                const summary = isEn ? (r.summary_en ?? r.summary_he) : (r.summary_he ?? r.summary_en);
                const remedy = isEn ? (r.remedy_en ?? r.remedy_he) : (r.remedy_he ?? r.remedy_en);
                return (
                  <div key={r.id} style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.25)', borderRadius: 10, padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{component}</span>
                      {r.recall_year && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--surface-2)', padding: '1px 8px', borderRadius: 99, border: '1px solid var(--border)' }}>
                          {r.recall_year}
                        </span>
                      )}
                    </div>
                    {summary && (
                      <p style={{ margin: '0 0 6px', fontSize: '0.82rem', lineHeight: 1.6, color: 'var(--text-muted)' }}>{summary}</p>
                    )}
                    {remedy && (
                      <p style={{ margin: 0, fontSize: '0.8rem', lineHeight: 1.5, color: 'var(--text-muted)' }}>
                        <strong style={{ color: 'var(--text)' }}>{isEn ? 'Fix: ' : 'תיקון: '}</strong>{remedy}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 8 }}>
              {isEn ? 'US recalls (NHTSA)' : 'ריקולים שפורסמו בארה״ב (NHTSA). לא כל ריקול אמריקאי חל על רכבים שנמכרו בישראל.'}
            </p>
          </section>
        )}

        {/* Owner reviews mentioning issues */}
        {problemReviews.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 14 }}>
              {ip.ownersSay}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {problemReviews.map(r => (
                <div key={r.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{r.authorName ?? ip.carOwner}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>· {r.rating}/5 ★</span>
                    {r.year && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>· {r.year}</span>}
                  </div>
                  {r.body && (
                    <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--text-muted)' }}>
                      {r.body.slice(0, 300)}{r.body.length > 300 ? '…' : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Pre-purchase checks (Hebrew site) */}
        {!isEn && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12 }}>
              מה לבדוק לפני שקונים {fullName} יד שנייה
            </h2>
            <ul style={{ margin: 0, paddingInlineStart: 20, display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.9rem', lineHeight: 1.7 }}>
              {il.total > 0 && (
                <li>
                  בקשו מהמוכר אישור מהיבואן{importer ? ` (${importer})` : ''} שקריאות השירות שחלות על הרכב בוצעו
                  {il.systems.length > 0 && <>, בדגש על {il.systems.slice(0, 2).map((x) => x.label).join(' ו')}</>}.
                </li>
              )}
              <li>
                הריצו <Link href="/vehicle-lookup" style={{ color: 'var(--accent)', fontWeight: 700 }}>בדיקת רכב לפי מספר רישוי</Link>:
                תוקף טסט, מספר בעלים וקילומטראז׳ מדווח.
              </li>
              {cons.length > 0 && (
                <li>בנסיעת המבחן שימו לב לנקודות שחוזרות בביקורות: {cons.slice(0, 2).join('; ')}.</li>
              )}
              <li>
                עברו על <Link href="/checklist" style={{ color: 'var(--accent)', fontWeight: 700 }}>צ׳קליסט הקנייה</Link> ובצעו בדיקה במכון בדיקה מורשה לפני העברת בעלות.
              </li>
            </ul>
          </section>
        )}

        {/* FAQ - same questions as the FAQPage structured data */}
        {faqItems.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12 }}>
              {isEn ? 'Frequently asked questions' : 'שאלות נפוצות'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {faqItems.map(({ q, a }) => (
                <div key={q}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 4px' }}>{q}</h3>
                  <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--text-muted)' }}>{a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Related pages */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12 }}>
            {isEn ? 'Related' : 'עוד על הדגם והמתחרים'}
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              { href: `/cars/${make.slug}/${model.slug}`, label: isEn ? `${fullName} reviews & prices` : `${fullName}: חוות דעת ומחירים` },
              { href: `/cars/${make.slug}/problems`, label: isEn ? `All ${makeName} problems & recalls` : `כל הבעיות והריקולים של ${makeName}` },
              ...comparePairs.map((p) => {
                const other = p.a.key === `${make.slug}/${model.slug}` ? p.b : p.a;
                const otherName = isEn ? `${other.make.nameEn} ${other.model.nameEn}` : `${other.make.nameHe} ${other.model.nameHe}`;
                return { href: p.path, label: isEn ? `${modelName} vs ${otherName}` : `${modelName} מול ${otherName}` };
              }),
              ...siblings.map((m) => ({
                href: `/cars/${make.slug}/${m.slug}/issues`,
                label: isEn ? `${make.nameEn} ${m.nameEn} problems` : `תקלות ${make.nameHe} ${m.nameHe}`,
              })),
            ].map((l) => (
              <Link key={l.href} href={l.href} style={{ fontSize: '0.82rem', color: 'var(--text)', textDecoration: 'none', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 99, padding: '5px 12px' }}>
                {l.label}
              </Link>
            ))}
          </div>
        </section>

        {/* CTA back + write review */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
          <Link
            href={`/cars/${make.slug}/${model.slug}`}
            className="btn btn-outline"
            style={{ fontSize: '0.875rem' }}
          >
            {ip.backTo} {modelName}
          </Link>
          <Link
            href={`/cars/${make.slug}/${model.slug}#write-review`}
            className="btn btn-primary"
            style={{ fontSize: '0.875rem' }}
          >
            {ip.addReview}
          </Link>
        </div>
      </div>
    </div>
  );
}

/** One Israeli recall notice: system, notice year, affected production years, fault and fix. */
function IlRecallCard({ r }: { r: IsraeliRecall }) {
  const built = buildYearsLabel(r);
  const system = faultLabel(r.faultType);
  const isCampaign = !!r.recallType && !r.recallType.includes('בטיחות');
  return (
    <div style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.25)', borderRadius: 10, padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        {system && <h3 style={{ fontWeight: 700, fontSize: '0.88rem', margin: 0 }}>{system}</h3>}
        {r.year && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--surface-2)', padding: '1px 8px', borderRadius: 99, border: '1px solid var(--border)' }}>
            פורסם {r.year}
          </span>
        )}
        {built && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--surface-2)', padding: '1px 8px', borderRadius: 99, border: '1px solid var(--border)' }}>
            שנות ייצור {built}
          </span>
        )}
        {isCampaign && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.recallType}</span>
        )}
      </div>
      {r.faultDescription && (
        <p style={{ margin: '0 0 6px', fontSize: '0.85rem', lineHeight: 1.6 }}>{r.faultDescription}</p>
      )}
      {r.fixMethod && (
        <p style={{ margin: 0, fontSize: '0.8rem', lineHeight: 1.5, color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text)' }}>אופן הטיפול: </strong>{r.fixMethod}
        </p>
      )}
    </div>
  );
}
