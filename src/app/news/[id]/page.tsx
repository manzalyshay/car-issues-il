import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import { getNewsArticleBySegment } from '@/lib/carNews';
import { newsPath, newsSegment } from '@/lib/newsSlug';
import NewsAdminActions from '@/components/NewsAdminActions';

export const revalidate = 1800;

const SOURCE_LABELS: Record<string, string> = {
  motor1: 'Motor1',
  caranddriver: 'Car and Driver',
  cartube: 'CarTube',
};

function timeAgo(iso: string | null, isHe: boolean): string {
  if (!iso) return '';
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return isHe ? 'לפני פחות משעה' : 'less than an hour ago';
  if (h < 24) return isHe ? `לפני ${h} שעות` : `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return isHe ? 'אתמול' : 'yesterday';
  if (d < 7) return isHe ? `לפני ${d} ימים` : `${d} days ago`;
  return new Date(iso).toLocaleDateString(isHe ? 'he-IL' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const [locale, article] = await Promise.all([getHostLocale(), getNewsArticleBySegment(id)]);
  if (!article) return {};
  const base = getBaseUrl(locale);
  const isHe = locale === 'he';
  const title = (isHe ? (article.title_he ?? article.title_en) : (article.title_en ?? article.title_he))?.replace(/[—–]/g, '-');
  const desc  = isHe ? (article.body_he ?? article.body_en) : (article.body_en ?? article.body_he);
  return {
    title,
    description: desc?.slice(0, 160) ?? '',
    alternates: { canonical: `${base}${newsPath(article)}` },
    openGraph: {
      title: title ?? '',
      description: desc?.slice(0, 160) ?? '',
      images: article.image_url ? [{ url: article.image_url, width: 1200, height: 630 }] : [],
      type: 'article',
    },
  };
}

export default async function NewsArticlePage({ params }: Props) {
  const { id } = await params;
  const [locale, article] = await Promise.all([getHostLocale(), getNewsArticleBySegment(id)]);
  if (!article) notFound();
  // Old hash URLs (/news/<sha1>) and stale slugs → the canonical slug URL (308).
  // Works as a real HTTP redirect because no loading boundary wraps this segment.
  if (decodeURIComponent(id) !== newsSegment(article)) permanentRedirect(newsPath(article));

  const isHe = locale === 'he';
  const title = isHe ? (article.title_he ?? article.title_en) : (article.title_en ?? article.title_he);
  const rawBody = isHe ? (article.body_he ?? article.body_en) : (article.body_en ?? article.body_he);
  const body = rawBody?.replace(/אחד מה-SUV החשמליים החזקים שהושקו אי פעם/g, 'מבין רכבי ה-SUV החשמליים החזקים שהוצגו השנה').replace(/[—–]/g, '-') ?? null;
  const sourceName = SOURCE_LABELS[article.source] ?? article.source;
  const imageUrl = article.image_url && !article.image_url.includes('cdn.motor1.com') ? article.image_url : null;
  const isUsCitiesStudy = article.id.startsWith('b70e9563ca');

  const base = getBaseUrl(locale);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: title,
    description: (isHe ? article.body_he : article.body_en)?.slice(0, 160) ?? '',
    url: `${base}${newsPath(article)}`,
      ...(imageUrl ? { image: [imageUrl] } : {}),
    ...(article.published_at ? { datePublished: article.published_at } : {}),
    publisher: {
      '@type': 'Organization',
      name: 'CarIssues',
      url: base,
    },
    inLanguage: isHe ? 'he' : 'en',
  };

  return (
    <div className="page-section" dir={isHe ? 'rtl' : 'ltr'}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="container" style={{ maxWidth: 760 }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 24 }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{isHe ? 'בית' : 'Home'}</Link>
          <span>›</span>
          <Link href="/news" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{isHe ? 'חדשות רכב' : 'Car News'}</Link>
          <span>›</span>
          <span style={{ color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '40ch' }}>{title}</span>
        </div>

        {/* Publication time; the source is credited once below the article. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-faint)' }}>{timeAgo(article.published_at, isHe)}</span>
        </div>

        {/* Translation pending notice */}
        {isHe && !article.body_he && (
          <div style={{ background: '#fff6e0', border: '1px solid #f6e2b2', borderRadius: 10, padding: '10px 14px', marginBottom: 18, fontSize: 13.5, color: '#7a5000', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>⏳</span>
            <span>תרגום המאמר בדרך - יהיה זמין בקרוב</span>
          </div>
        )}
        {!isHe && !article.body_en && (
          <div style={{ background: '#fff6e0', border: '1px solid #f6e2b2', borderRadius: 10, padding: '10px 14px', marginBottom: 18, fontSize: 13.5, color: '#7a5000', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>⏳</span>
            <span>English translation coming soon</span>
          </div>
        )}

        {/* Title */}
        <h1 style={{ margin: '0 0 20px', fontSize: 'clamp(20px,3.5vw,28px)', fontWeight: 900, lineHeight: 1.25, letterSpacing: '-0.02em' }}>
          {title}
        </h1>

        {/* Hero image */}
        {imageUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageUrl}
            alt={title ?? ''}
            style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 12, marginBottom: 28, display: 'block' }}
          />
        )}

        {/* Body */}
        {body ? (
          <div style={{ fontSize: '1rem', lineHeight: 1.8, color: 'var(--text)', direction: isHe ? 'rtl' : 'ltr' }}>
            {isHe && isUsCitiesStudy && <p style={{ margin: '0 0 1.2em' }}>המחקר המתואר בכתבה נערך בארה״ב; הנתונים אינם מתייחסים לערים בישראל.</p>}
            {body.split(/\n\n+/).map((para, i) => (
              <p key={i} style={{ margin: '0 0 1.2em' }}>{para.trim()}</p>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>{isHe ? 'תוכן המאמר אינו זמין.' : 'Article content not available.'}</p>
        )}

        {/* Original source link */}
        <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {isHe ? `מקור: ${sourceName}` : `Source: ${sourceName}`}
          </span>
          <a
            href={article.original_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}
          >
            {isHe ? 'למאמר המקורי ←' : 'Read original →'}
          </a>
        </div>

        {/* Back link */}
        <div style={{ marginTop: 24 }}>
          <Link href="/news" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
            {isHe ? '← כל החדשות' : '← All news'}
          </Link>
        </div>

        <NewsAdminActions newsId={article.id} />

      </div>
    </div>
  );
}
