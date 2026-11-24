import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import { getReviewsForModel } from '@/lib/reviewsDb';
import { ownerAggregateRating } from '@/lib/ownerRating';
import { ccLabel, getMotoModel, getMotoRecalls, motoCategoryLabel, motoKey } from '@/lib/motoDb';
import ModelReviewsSection from '@/app/cars/[make]/[model]/ModelReviewsSection';
import RecallsSection from '@/components/RecallsSection';
import FollowButton from '@/components/FollowButton';
import WriteReviewButton from '@/components/WriteReviewButton';
import ReviewNudge from '@/components/ReviewNudge';
import SharePopup from '@/components/SharePopup';
import MotoModelCard, { MOTO_ICON } from '@/components/moto/MotoModelCard';
import MotoAiSummary from '@/components/moto/MotoAiSummary';
import HeroMedia from '@/components/HeroMedia';
import { getImagesForCar } from '@/lib/carImages';
import { findCarModel } from '@/lib/sketchfab';

export const revalidate = 900;

interface Props { params: Promise<{ make: string; model: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { make: m, model: mo } = await params;
  const found = await getMotoModel(m, mo);
  if (!found) return {};
  const { make, model } = found;
  const name = `${make.nameHe} ${model.nameHe}`;
  const reviews = await getReviewsForModel(motoKey(make.slug), model.slug).catch(() => []);
  return {
    title: `${name}: בעיות נפוצות, ריקולים וחוות דעת בעלים`,
    description: `${name}${model.nameEn !== model.nameHe ? ` (${make.nameEn} ${model.nameEn})` : ''}: `
      + (reviews.length ? `${reviews.length} ביקורות בעלים, ` : 'ביקורות בעלים, ')
      + `קריאות שירות של משרד התחבורה${model.activeVehiclesIl ? ` ו-${model.activeVehiclesIl.toLocaleString('he-IL')} כלים על הכביש בישראל` : ''}.`,
    alternates: { canonical: `${getBaseUrl('he')}/motorcycles/${make.slug}/${model.slug}` },
  };
}

export default async function MotoModelPage({ params }: Props) {
  if ((await getHostLocale()) === 'en') notFound();
  const { make: m, model: mo } = await params;
  const found = await getMotoModel(m, mo);
  if (!found) notFound();
  const { make, model } = found;
  const key = motoKey(make.slug);
  // Photos and 3D models live in car_images / car_3d_models under the same 'moto-<make>' key
  const [reviews, recalls, images, model3d] = await Promise.all([
    getReviewsForModel(key, model.slug).catch(() => []),
    getMotoRecalls(make, model),
    getImagesForCar(key, model.slug).catch(() => []),
    findCarModel(key, model.slug).catch(() => null),
  ]);

  const base = getBaseUrl('he');
  const url = `${base}/motorcycles/${make.slug}/${model.slug}`;
  const name = `${make.nameHe} ${model.nameHe}`;
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
  const yearRange = model.years.length ? `${model.years[model.years.length - 1]}–${model.years[0]}` : null;
  const cc = ccLabel(model);
  const stats = [
    model.activeVehiclesIl ? { label: 'על הכביש בישראל', value: model.activeVehiclesIl.toLocaleString('he-IL') } : null,
    yearRange ? { label: 'שנות ייצור', value: yearRange, ltr: true } : null,
    { label: cc ? 'סוג · נפח מנוע' : 'סוג', value: cc ? `${motoCategoryLabel(model.category)} · ${cc}` : motoCategoryLabel(model.category) },
  ].filter((s): s is { label: string; value: string; ltr?: boolean } => !!s);
  const others = make.models.filter((x) => x.slug !== model.slug).slice(0, 6);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <section className="mp-hero">
        <div className="model-hero-inner" style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 'clamp(16px,3vw,40px)', alignItems: 'flex-start' }}>
          <div className="model-hero-info" style={{ flex: '1 1 420px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'clamp(16px,1.6vw,20px)' }}>
            <nav aria-label="פירורי לחם" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#aab6d4', flexWrap: 'wrap' }}>
              <Link href="/" style={{ color: '#aab6d4', textDecoration: 'none' }}>בית</Link>
              <span aria-hidden="true">‹</span>
              <Link href="/motorcycles" style={{ color: '#aab6d4', textDecoration: 'none' }}>אופנועים</Link>
              <span aria-hidden="true">‹</span>
              <Link href={`/motorcycles/${make.slug}`} style={{ color: '#aab6d4', textDecoration: 'none' }}>{make.nameHe}</Link>
              <span aria-hidden="true">‹</span>
              <span style={{ color: '#fff' }}>{model.nameHe}</span>
            </nav>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <h1 style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 800, fontSize: 'clamp(30px,3.4vw,46px)', lineHeight: 1.08, margin: 0, color: '#fff' }}>
                <span aria-hidden="true" style={{ marginInlineEnd: 10 }}>{MOTO_ICON[model.category] ?? '🏍️'}</span>{name}
              </h1>
              <p style={{ margin: 0, fontSize: 'clamp(15px,1.3vw,18px)', color: '#c3cde3' }}>
                בעיות נפוצות, ריקולים וחוות דעת בעלים · <span dir="ltr">{make.nameEn} {model.nameEn}</span>
              </p>
            </div>

            <div className="hero-stats" style={{ display: 'grid', gridTemplateColumns: `repeat(${stats.length},minmax(0,1fr))` }}>
              {stats.map((st) => (
                <div key={st.label} className="hero-stat" style={{ background: '#182a54', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 'clamp(12px,1vw,13px)', color: '#aab6d4' }}>{st.label}</span>
                  <span dir={st.ltr ? 'ltr' : undefined} style={{ fontSize: 'clamp(16px,1.6vw,22px)', fontWeight: 800, lineHeight: 1.2, textAlign: 'right' }}>{st.value}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 14, color: '#aab6d4' }}>
              {avg !== null ? (
                <>
                  <span style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                    <span style={{ fontWeight: 800, fontSize: 24, lineHeight: 1, color: '#fff' }}>{(avg * 2).toFixed(1)}</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>/10</span>
                  </span>
                  <span>{reviews.length} ביקורות בעלים</span>
                </>
              ) : <span>עדיין אין ביקורות בעלים - שתפו את הניסיון שלכם</span>}
              <span>· {recalls.length ? `${recalls.length} קריאות שירות בישראל` : 'לא נמצאו קריאות שירות בישראל'}</span>
            </div>

            <div className="hero-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <WriteReviewButton />
              <FollowButton makeSlug={key} modelSlug={model.slug} isEn={false} dark />
              <SharePopup title={`${name}: בעיות נפוצות וחוות דעת בעלים`} url={url} dark iconOnly />
            </div>
          </div>

          {(images.length > 0 || model3d) && (
            <div className="model-hero-media" style={{ flex: '1 1 460px', minWidth: 0 }}>
              <HeroMedia
                images={images}
                sketchfabModel={model3d}
                makeSlug={key}
                modelSlug={model.slug}
                makeNameEn={make.nameEn}
                modelNameEn={model.nameEn}
                yearRange={yearRange ?? ''}
                categoryLabel={motoCategoryLabel(model.category)}
              />
            </div>
          )}
        </div>
      </section>

      <div className="container" style={{ paddingTop: 28, paddingBottom: 48, maxWidth: 900 }}>
        <MotoAiSummary makeSlug={make.slug} modelSlug={model.slug} name={name} />

        <section id="reviews" style={{ marginBottom: 40 }}>
          <ModelReviewsSection
            makeSlug={key}
            modelSlug={model.slug}
            years={model.years}
            trims={model.trims.length ? model.trims.map((t) => `${model.nameEn} ${t}`) : undefined}
            initialReviews={reviews}
          />
        </section>

        <section id="recalls" style={{ marginBottom: 40 }}>
          <RecallsSection
            makeEn={make.nameEn}
            modelEn={model.nameEn}
            years={model.years}
            initialRecalls={recalls}
            hideDiagram
            intro={`קריאות שירות שפרסם משרד התחבורה ל${name}. כדי לבדוק אופנוע מסוים, הזינו את מספר הרישוי שלו בבדיקת האופנוע.`}
          />
          <Link href="/motorcycle-check" style={{ display: 'inline-block', marginTop: 12, fontWeight: 700, color: 'var(--accent)', textDecoration: 'none' }}>
            🔎 בדיקת אופנוע לפי מספר רישוי ←
          </Link>
        </section>

        {others.length > 0 && (
          <section style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 12px' }}>עוד דגמים של {make.nameHe}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {others.map((o) => <MotoModelCard key={o.slug} make={make} model={o} />)}
            </div>
          </section>
        )}

        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 24 }}>
          מספר הכלים על הכביש: מאגר כלי הרכב הדו-גלגליים של משרד התחבורה{model.activeVehiclesIlAsOf ? `, נכון ל-${model.activeVehiclesIlAsOf.split('-').reverse().join('.')}` : ''}.
        </p>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'בית', item: base },
                { '@type': 'ListItem', position: 2, name: 'אופנועים', item: `${base}/motorcycles` },
                { '@type': 'ListItem', position: 3, name: make.nameHe, item: `${base}/motorcycles/${make.slug}` },
                { '@type': 'ListItem', position: 4, name: model.nameHe, item: url },
              ],
            },
            (() => {
              const rating = ownerAggregateRating(reviews);
              return rating ? {
                '@context': 'https://schema.org',
                '@type': 'Product',
                name: `${make.nameEn} ${model.nameEn}`,
                brand: { '@type': 'Brand', name: make.nameEn },
                url,
                aggregateRating: rating,
              } : null;
            })(),
          ].filter(Boolean)),
        }}
      />

      <ReviewNudge
        makeSlug={key}
        modelSlug={model.slug}
        makeNameHe={make.nameHe}
        modelNameHe={model.nameHe}
        makeNameEn={make.nameEn}
        modelNameEn={model.nameEn}
      />
    </div>
  );
}
