import type { Metadata } from 'next';
import Link from 'next/link';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import { getLatestNews, ensureNewsTable } from '@/lib/carNews';
import NewsGrid from './NewsGrid';

export const revalidate = 1800;

interface Props { searchParams: Promise<{ page?: string }> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
  const locale = await getHostLocale();
  const base = getBaseUrl(locale);
  // Each page now shows a distinct, non-overlapping batch of articles, so it
  // canonicalizes to itself rather than folding back into the base URL.
  const canonical = page > 1 ? `${base}/news?page=${page}` : `${base}/news`;
  const pageSuffix = page > 1 ? (locale === 'he' ? ` - עמוד ${page}` : ` - Page ${page}`) : '';
  return locale === 'he' ? {
    title: `חדשות רכב${pageSuffix}`,
    description: 'חדשות רכב עדכניות מהעולם - עיבוד ותרגום AI, מתעדכן יומית',
    alternates: { canonical },
  } : {
    title: `Car News${pageSuffix}`,
    description: 'Latest car news from around the world - AI-rewritten daily',
    alternates: { canonical },
  };
}

export default async function NewsPage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
  const locale = await getHostLocale();
  const isHe = locale === 'he';
  await ensureNewsTable().catch(() => {});
  // Articles with no usable photo are not shown at all (getLatestNews leaves them out).
  const newsRaw = await getLatestNews(300, 0, locale).catch(() => []);
  // Client component props are serialized into the page HTML - strip the other
  // locale's title/body so Hebrew text never leaks into the English site's source
  // (and vice versa), even when it isn't actually rendered. On the English site,
  // also drop outlet-identifying fields (source, original_url) - that data stays
  // in the database only.
  const news = newsRaw.map((n) => (isHe
    ? { ...n, title_en: null, body_en: null }
    : { ...n, title_he: null, body_he: null, source: '', original_url: '' }
  ));

  const PAGE = 40;
  // page=N shows only that batch (items (N-1)*40+1 .. N*40), not cumulative -
  // "Load more" then continues forward from there.
  const newsForPage = news.slice((page - 1) * PAGE);

  return (
    <div className="page-section" dir={isHe ? 'rtl' : 'ltr'}>
      <div className="container">

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 24 }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{isHe ? 'בית' : 'Home'}</Link>
          <span>›</span>
          <span style={{ color: 'var(--text)' }}>{isHe ? 'חדשות רכב' : 'Car News'}</span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 'clamp(22px,3vw,30px)', fontWeight: 900, letterSpacing: '-0.02em' }}>
            {isHe ? '🗞️ חדשות רכב' : '🗞️ Car News'}
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {isHe
              ? 'חדשות מהעולם, עיבוד מחדש בידי AI - מתעדכן יומית'
              : 'World automotive news, AI-rewritten - updated daily'}
          </p>
        </div>

        {news.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📡</div>
            <p style={{ margin: 0, fontWeight: 600 }}>{isHe ? 'החדשות הראשונות בדרך - חזור מחר' : 'First articles on the way - check back tomorrow'}</p>
          </div>
        ) : (
          <NewsGrid key={page} news={newsForPage} isHe={isHe} />
        )}

        {/* Pagination links - crawlable alternative to "Load more" */}
        {news.length > 40 && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 32 }}>
            {page > 1 && (
              <Link href={page === 2 ? '/news' : `/news?page=${page - 1}`} style={{ fontSize: '0.875rem', color: 'var(--accent)', textDecoration: 'none' }}>
                {isHe ? '← הקודם' : '← Previous'}
              </Link>
            )}
            {page * 40 < news.length && (
              <Link href={`/news?page=${page + 1}`} style={{ fontSize: '0.875rem', color: 'var(--accent)', textDecoration: 'none' }}>
                {isHe ? 'הבא →' : 'Next →'}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
