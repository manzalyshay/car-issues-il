import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMakeBySlug } from '@/lib/carsDb';
import { dbAll } from '@/lib/db';
import MakeLogo from '@/components/MakeLogo';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import { translations } from '@/lib/translations';

export const revalidate = 86400;

interface Props { params: Promise<{ make: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { make: makeSlug } = await params;
  const [locale, make] = await Promise.all([getHostLocale(), getMakeBySlug(makeSlug)]);
  if (!make) return {};
  const base = getBaseUrl(locale);
  const isEn = locale === 'en';
  const url = `${base}/cars/${make.slug}/problems`;
  return {
    title: isEn
      ? `${make.nameEn} Common Problems & Recalls | CarIssues`
      : `בעיות נפוצות וריקולים ב${make.nameHe} | CarIssues`,
    description: isEn
      ? `All known ${make.nameEn} problems, recalls, and reported issues across every model — based on NHTSA data and real owner reviews.`
      : `כל הבעיות הנפוצות, הריקולים והתקלות המדווחות בדגמי ${make.nameHe} — מבוסס על נתוני NHTSA וביקורות בעלים.`,
    alternates: {
      canonical: url,
      languages: {
        he: `https://carissues.co.il/cars/${make.slug}/problems`,
        en: `https://carissues.net/cars/${make.slug}/problems`,
        'x-default': `https://carissues.net/cars/${make.slug}/problems`,
      },
    },
    openGraph: { title: isEn ? `${make.nameEn} Problems & Recalls` : `בעיות ב${make.nameHe}`, url },
  };
}

export default async function MakeProblemsPage({ params }: Props) {
  const { make: makeSlug } = await params;
  const [locale, make] = await Promise.all([getHostLocale(), getMakeBySlug(makeSlug)]);
  if (!make) notFound();

  const cp = translations[locale].carsPage;
  const isEn = locale === 'en';
  const makeName = isEn ? make.nameEn : make.nameHe;
  const base = getBaseUrl(locale);

  // Fetch expert reviews (cons/pros) and recall counts for all models of this make
  const [expertRows, recallRows] = await Promise.all([
    dbAll<{ model_slug: string; cons: string | null; cons_en: string | null }>(
      'SELECT model_slug, cons, cons_en FROM expert_reviews WHERE make_slug = ? AND year IS NULL',
      makeSlug,
    ).catch(() => []),
    dbAll<{ model: string; cnt: number }>(
      'SELECT model, COUNT(*) as cnt FROM recalls_cache WHERE make = ? GROUP BY model',
      make.nameEn.toLowerCase(),
    ).catch(() => []),
  ]);

  // Build cons map
  const consMap: Record<string, string[]> = {};
  for (const r of expertRows) {
    try {
      const arr = r.cons ? (Array.isArray(r.cons) ? r.cons : JSON.parse(String(r.cons))) : [];
      const arrEn = r.cons_en ? (Array.isArray(r.cons_en) ? r.cons_en : JSON.parse(String(r.cons_en))) : [];
      consMap[r.model_slug] = isEn ? arrEn : arr;
    } catch {
      consMap[r.model_slug] = [];
    }
  }

  // Build recall map (keyed by lowercased model English name)
  const recallMap: Record<string, number> = {};
  for (const r of recallRows) recallMap[r.model.toLowerCase()] = r.cnt;
  const totalRecalls = Object.values(recallMap).reduce((a, b) => a + b, 0);

  // Build per-model issue summary, sorted by issue count descending
  const modelIssues = make.models
    .map((model) => ({
      slug: model.slug,
      nameHe: model.nameHe,
      nameEn: model.nameEn,
      years: model.years,
      cons: consMap[model.slug] ?? [],
      recallCount: recallMap[model.nameEn.toLowerCase()] ?? 0,
    }))
    .sort((a, b) => (b.cons.length + b.recallCount * 2) - (a.cons.length + a.recallCount * 2));

  const modelsWithIssues = modelIssues.filter((m) => m.cons.length > 0 || m.recallCount > 0);
  const modelsNoData = modelIssues.filter((m) => m.cons.length === 0 && m.recallCount === 0);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: isEn ? 'Home' : 'בית', item: base },
          { '@type': 'ListItem', position: 2, name: isEn ? 'Makes' : 'יצרנים', item: `${base}/cars` },
          { '@type': 'ListItem', position: 3, name: makeName, item: `${base}/cars/${make.slug}` },
          { '@type': 'ListItem', position: 4, name: isEn ? 'Problems' : 'בעיות', item: `${base}/cars/${make.slug}/problems` },
        ],
      },
      modelsWithIssues.length > 0 && {
        '@type': 'FAQPage',
        mainEntity: modelsWithIssues.slice(0, 5).flatMap((m) => {
          const name = isEn ? `${make.nameEn} ${m.nameEn}` : `${make.nameHe} ${m.nameHe}`;
          const items = [];
          if (m.cons.length > 0) {
            items.push({
              '@type': 'Question',
              name: isEn ? `What are common problems with the ${name}?` : `מה הבעיות הנפוצות של ${name}?`,
              acceptedAnswer: { '@type': 'Answer', text: m.cons.join('. ') },
            });
          }
          if (m.recallCount > 0) {
            items.push({
              '@type': 'Question',
              name: isEn ? `Were there recalls for the ${name}?` : `האם היו ריקולים ל${name}?`,
              acceptedAnswer: { '@type': 'Answer', text: isEn ? `Yes, ${m.recallCount} recall(s) were recorded for the ${name}.` : `כן, תועדו ${m.recallCount} ריקולים ל${name}.` },
            });
          }
          return items;
        }),
      },
    ].filter(Boolean),
  };

  return (
    <div className="page-section">
      <div className="container" style={{ maxWidth: 860 }}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

        {/* Breadcrumb */}
        <nav style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/cars" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{cp.makes}</Link>
          <span>›</span>
          <Link href={`/cars/${make.slug}`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{makeName}</Link>
          <span>›</span>
          <span>{isEn ? 'Problems & Recalls' : 'בעיות ריקולים'}</span>
        </nav>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <MakeLogo logoUrl={make.logoUrl} nameEn={make.nameEn} size={44} />
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
              {isEn ? `${make.nameEn} — Common Problems & Recalls` : `${make.nameHe} — בעיות נפוצות וריקולים`}
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {isEn
                ? `${make.models.length} models · ${totalRecalls} total recalls · Based on NHTSA data & owner reviews`
                : `${make.models.length} דגמים · ${totalRecalls} ריקולים סה"כ · מבוסס על NHTSA וביקורות בעלים`}
            </p>
          </div>
        </div>

        {/* Summary stats */}
        {totalRecalls > 0 && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(230,57,70,0.06)', border: '1px solid rgba(230,57,70,0.2)', borderRadius: 10, padding: '12px 20px', minWidth: 140, textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#e63946' }}>{totalRecalls}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>{isEn ? 'Total Recalls' : 'סה"כ ריקולים'}</div>
            </div>
            <div style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.25)', borderRadius: 10, padding: '12px 20px', minWidth: 140, textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ca8a04' }}>{modelsWithIssues.length}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>{isEn ? 'Models with Issues' : 'דגמים עם בעיות'}</div>
            </div>
          </div>
        )}

        {/* Models with issues */}
        {modelsWithIssues.length > 0 ? (
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>
              {isEn ? 'Issues by Model' : 'בעיות לפי דגם'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {modelsWithIssues.map((m) => {
                const name = isEn ? `${make.nameEn} ${m.nameEn}` : `${make.nameHe} ${m.nameHe}`;
                const yearRange = m.years.length > 0 ? `${m.years[m.years.length - 1]}–${m.years[0]}` : '';
                return (
                  <div key={m.slug} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: m.cons.length > 0 ? 12 : 0 }}>
                      <div>
                        <Link href={`/cars/${make.slug}/${m.slug}`} style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)', textDecoration: 'none' }}>
                          {name}
                        </Link>
                        {yearRange && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginInlineStart: 8 }}>{yearRange}</span>
                        )}
                        <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                          {m.recallCount > 0 && (
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 10px', borderRadius: 99, background: 'rgba(230,57,70,0.08)', border: '1px solid rgba(230,57,70,0.25)', color: '#e63946' }}>
                              {m.recallCount} {isEn ? 'recalls' : 'ריקולים'}
                            </span>
                          )}
                          {m.cons.length > 0 && (
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 10px', borderRadius: 99, background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)', color: '#ca8a04' }}>
                              {m.cons.length} {isEn ? 'known issues' : 'בעיות מוכרות'}
                            </span>
                          )}
                        </div>
                      </div>
                      <Link href={`/cars/${make.slug}/${m.slug}/issues`} style={{
                        padding: '6px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700,
                        background: 'var(--accent)', color: '#fff', textDecoration: 'none',
                        flexShrink: 0, whiteSpace: 'nowrap',
                      }}>
                        {isEn ? 'View Issues' : 'לבעיות'}
                      </Link>
                    </div>
                    {m.cons.length > 0 && (
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {m.cons.slice(0, 3).map((con, i) => (
                          <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                            <span style={{ color: '#e63946', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✗</span>
                            <span>{con}</span>
                          </li>
                        ))}
                        {m.cons.length > 3 && (
                          <li style={{ fontSize: '0.78rem', color: 'var(--text-muted)', paddingInlineStart: 20 }}>
                            +{m.cons.length - 3} {isEn ? 'more' : 'נוספות'}
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>
            {isEn ? 'No recorded issues found for this brand yet.' : 'לא נמצאו בעיות מתועדות עדיין עבור מותג זה.'}
          </p>
        )}

        {/* Models with no data (collapsed list) */}
        {modelsNoData.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10 }}>
              {isEn ? `${modelsNoData.length} models with no recorded issues` : `${modelsNoData.length} דגמים ללא בעיות מתועדות`}
            </h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {modelsNoData.map((m) => (
                <Link key={m.slug} href={`/cars/${make.slug}/${m.slug}/issues`} style={{
                  padding: '4px 12px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 600,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  color: 'var(--text-muted)', textDecoration: 'none',
                }}>
                  {isEn ? m.nameEn : m.nameHe}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          <Link href={`/cars/${make.slug}`} className="btn btn-outline" style={{ fontSize: '0.875rem' }}>
            {isEn ? `← All ${make.nameEn} Models` : `← כל דגמי ${make.nameHe}`}
          </Link>
          <Link href="/repairs" className="btn btn-outline" style={{ fontSize: '0.875rem' }}>
            {isEn ? 'Repair Costs' : 'עלויות תיקון'}
          </Link>
        </div>
      </div>
    </div>
  );
}
