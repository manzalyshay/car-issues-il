import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMakeBySlug, getModelBySlug } from '@/lib/carsDb';
import { getExpertReviews } from '@/lib/expertReviews';
import { getReviewsForModel } from '@/lib/reviewsDb';
import { getRepairCosts } from '@/lib/repairCostsDb';
import MakeLogo from '@/components/MakeLogo';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import { translations } from '@/lib/translations';

export const revalidate = 86400;

interface Props { params: Promise<{ make: string; model: string }> }

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
  return {
    title: isEn
      ? `${make.nameEn} ${model.nameEn} — Common Problems & Issues`
      : `${make.nameHe} ${model.nameHe} — בעיות נפוצות ותקלות`,
    description: isEn
      ? `What are the common problems with the ${make.nameEn} ${model.nameEn}? Reported issues, pros & cons, repair costs and real owner reviews.`
      : `אילו בעיות נפוצות יש ל${make.nameHe} ${model.nameHe}? תקלות מדווחות, חסרונות, עלויות תיקון וחוות דעת אמיתיות מבעלים בישראל.`,
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
        ? `${make.nameEn} ${model.nameEn} — Common Problems`
        : `${make.nameHe} ${model.nameHe} — בעיות נפוצות`,
      description: isEn
        ? `Common issues, pros & cons, repair costs — ${make.nameEn} ${model.nameEn}`
        : `תקלות, חסרונות ועלויות תיקון — ${make.nameHe} ${model.nameHe}`,
      url,
    },
  };
}

export default async function IssuesPage({ params }: Props) {
  const { make: makeSlug, model: modelSlug } = await params;
  const [locale, make, model] = await Promise.all([
    getHostLocale(), getMakeBySlug(makeSlug), getModelBySlug(makeSlug, modelSlug),
  ]);
  if (!make) notFound();
  if (!model) notFound();
  const ip = translations[locale].issuesPage;
  const cp = translations[locale].carsPage;
  const isEn = locale === 'en';
  const makeName = isEn ? make.nameEn : make.nameHe;
  const modelName = isEn ? model.nameEn : model.nameHe;

  const [expertReviewsList, allReviews, repairCosts] = await Promise.all([
    getExpertReviews(makeSlug, modelSlug),
    getReviewsForModel(makeSlug, modelSlug),
    getRepairCosts(model.category),
  ]);

  const expertReview = expertReviewsList[0] ?? null;
  const base = getBaseUrl(locale);
  const cons = isEn ? (expertReview?.consEn ?? []) : (expertReview?.cons ?? []);
  const pros = isEn ? (expertReview?.prosEn ?? []) : (expertReview?.pros ?? []);
  const aiSummary = isEn ? expertReview?.localSummaryEn : expertReview?.localSummaryHe;

  // Reviews mentioning problems
  const problemReviews = allReviews
    .filter(r => r.rating <= 3 || (r.body && r.body.length > 50))
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
              {makeName} {modelName} — {ip.titleSuffix}
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {isEn ? make.nameEn : make.nameHe} {isEn ? model.nameEn : model.nameHe} · {ip.basedOn} {allReviews.length} {ip.ownerReviews}
            </p>
          </div>
        </div>

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
