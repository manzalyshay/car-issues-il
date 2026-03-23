import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { carDatabase, getMakeBySlug, getModelBySlug, getCategoryLabel } from '@/data/cars';
import { getReviewsForModel } from '@/lib/reviewsDb';
import { findCarModel } from '@/lib/sketchfab';
import { getExpertReviews } from '@/lib/expertReviews';
import StarRating from '@/components/StarRating';
import YearGrid from '@/components/YearGrid';
import Car3DViewer from '@/components/Car3DViewer';
import ExpertReviewsSection from '@/components/ExpertReviewsSection';

interface Props { params: Promise<{ make: string; model: string }> }

export async function generateStaticParams() {
  return carDatabase.flatMap((make) =>
    make.models.map((model) => ({ make: make.slug, model: model.slug })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { make: makeSlug, model: modelSlug } = await params;
  const make = getMakeBySlug(makeSlug);
  if (!make) return {};
  const model = getModelBySlug(make, modelSlug);
  if (!model) return {};
  return {
    title: `${make.nameHe} ${model.nameHe} — בעיות וביקורות`,
    description: `בעיות נפוצות ב${make.nameHe} ${model.nameHe}. ביקורות אמיתיות מבעלי רכב בישראל.`,
    openGraph: { title: `${make.nameHe} ${model.nameHe} | CarIssues IL` },
  };
}

export default async function ModelPage({ params }: Props) {
  const { make: makeSlug, model: modelSlug } = await params;
  const make = getMakeBySlug(makeSlug);
  if (!make) notFound();
  const model = getModelBySlug(make, modelSlug);
  if (!model) notFound();

  const [allReviews, expertReviewsList] = await Promise.all([
    getReviewsForModel(makeSlug, modelSlug),
    getExpertReviews(makeSlug, modelSlug),
  ]);
  const sketchfabModel = findCarModel(makeSlug, modelSlug);
  const expertReview = expertReviewsList[0] ?? null;
  const avgRating = allReviews.length
    ? allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length
    : null;

  return (
    <div style={{ padding: '48px 0 80px' }}>
      <div className="container">
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 24, flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>בית</Link>
          <span>›</span>
          <Link href="/cars" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>יצרנים</Link>
          <span>›</span>
          <Link href={`/cars/${make.slug}`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{make.nameHe}</Link>
          <span>›</span>
          <span style={{ color: 'var(--text-primary)' }}>{model.nameHe}</span>
        </div>

        {/* Model header + 3D viewer */}
        <div className="card" style={{ padding: '28px', marginBottom: 40, display: 'flex', gap: 32, alignItems: 'stretch', flexWrap: 'wrap' }}>
          {/* Left: title + badges */}
          <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 36 }}>{make.logoEmoji}</span>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 900 }}>{make.nameHe} {model.nameHe}</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>{make.nameEn} {model.nameEn}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="badge badge-gray">{getCategoryLabel(model.category)}</span>
              <span className="badge badge-blue">{model.years[model.years.length - 1]}–{model.years[0]}</span>
              {avgRating !== null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <StarRating rating={avgRating} size={16} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {avgRating.toFixed(1)}
                  </span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    ({allReviews.length} ביקורות)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: 3D viewer */}
          {sketchfabModel && (
            <div style={{ flex: '1 1 320px', minWidth: 280 }}>
              <Car3DViewer uid={sketchfabModel.uid} modelName={`${make.nameHe} ${model.nameHe}`} />
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
                <a href={sketchfabModel.viewerUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)' }}>
                  {sketchfabModel.name} · Sketchfab
                </a>
              </p>
            </div>
          )}
        </div>

        {/* Year selector */}
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 20 }}>בחר שנת ייצור</h2>
        <div style={{ marginBottom: 48 }}>
          <YearGrid
            years={model.years.map((year) => ({
              year,
              reviewCount: allReviews.filter((r) => r.year === year).length,
              href: `/cars/${make.slug}/${model.slug}/${year}`,
            }))}
          />
        </div>

        {/* General AI summary */}
        <ExpertReviewsSection
          review={expertReview}
          makeNameHe={make.nameHe}
          modelNameHe={model.nameHe}
        />

        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Product',
              name: `${make.nameEn} ${model.nameEn}`,
              brand: { '@type': 'Brand', name: make.nameEn },
              ...(avgRating !== null && {
                aggregateRating: {
                  '@type': 'AggregateRating',
                  ratingValue: avgRating.toFixed(1),
                  reviewCount: allReviews.length,
                  bestRating: 5,
                  worstRating: 1,
                },
              }),
            }),
          }}
        />
      </div>
    </div>
  );
}
